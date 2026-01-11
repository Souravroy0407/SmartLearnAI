from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional, List
import json
from datetime import datetime, timezone
from database import get_db
from models import User, Exam, ExamQuestion, ExamAssignment, StudentTeacherFollow, Student, ExamSubmission, ExamEvaluation, ExamReevaluation
from auth import get_current_user
from utils.exam_logger import log_exam_event, EVENT_EXAM_ASSIGNED, EVENT_EXAM_SUBMITTED, EVENT_EXAM_CHECKED, EVENT_REEVAL_REQUESTED, EVENT_EXAM_RE_EVALUATED, TRIGGER_TEACHER, TRIGGER_STUDENT
import zipfile
import io
from utils.brevo_email import send_email
from utils.email_templates import get_exam_assigned_template, get_exam_checked_template, get_reeval_completed_template
from pydantic import BaseModel

router = APIRouter()


class AssignExamRequest(BaseModel):
    assign_to_all: bool = False
    student_ids: List[int] = []

@router.get("/", response_model=List[dict])
def list_exams(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "teacher":
         raise HTTPException(status_code=403, detail="Only teachers can list their exams")

    exams = db.query(Exam).filter(Exam.teacher_id == current_user.id).order_by(Exam.created_at.desc()).all()
    
    results = []
    for exam in exams:
        results.append({
            "id": exam.id,
            "title": exam.title,
            "subject": exam.subject,
            "exam_type": exam.exam_type,
            "total_marks": exam.total_marks,
            "deadline": exam.deadline,
            "created_at": exam.created_at,
            "question_format": exam.question_format,
            "external_link": exam.external_link
        })
    return results


@router.get("/{exam_id}/assignments", response_model=List[int])
def get_exam_assignments(
    exam_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Validation: Role
    if current_user.role != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can view assignments")

    # 2. Validation: Exam ownership
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    if exam.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only view assignments for your own exams")

    # 3. Fetch Assignments
    assignments = db.query(ExamAssignment).filter(ExamAssignment.exam_id == exam_id).all()
    
    # Return list of student IDs (User IDs)
    return [a.student_id for a in assignments]


@router.post("/{exam_id}/assign")
def assign_exam(
    exam_id: int,
    request: AssignExamRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Validation: Role
    if current_user.role != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can assign exams")

    # 2. Validation: Exam ownership
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    if exam.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only assign your own exams")

    student_ids_to_assign = []

    # 3. Determine Students
    if request.assign_to_all:
        teacher_profile = current_user.teacher_profile
        if not teacher_profile:
             raise HTTPException(status_code=400, detail="Teacher profile not found")
             
        # Get all followers
        followers = db.query(StudentTeacherFollow).filter(StudentTeacherFollow.teacher_id == teacher_profile.id).all()
        for f in followers:
             # Get Student object to get User ID
             student = db.query(Student).filter(Student.id == f.student_id).first()
             if student:
                 student_ids_to_assign.append(student.user_id)
    else:
        # Validate provided IDs are valid students
        for uid in request.student_ids:
             # Verify it's a student
             stu = db.query(User).filter(User.id == uid, User.role == "student").first()
             if stu:
                 student_ids_to_assign.append(uid)
                 
    # 4. Filter duplicates (Already assigned)
    final_list = []
    for uid in set(student_ids_to_assign):
        existing = db.query(ExamAssignment).filter(
            ExamAssignment.exam_id == exam_id,
            ExamAssignment.student_id == uid
        ).first()
        if not existing:
            final_list.append(uid)
            
    if not final_list:
        return {"status": "success", "message": "No new students to assign (all selected were already assigned)"}

    # 5. Assign, Log, Email
    assigned_count = 0
    for uid in final_list:
        # A. Create Assignment
        assignment = ExamAssignment(
            exam_id=exam_id,
            student_id=uid,
            status="assigned",
            assigned_at=datetime.now(timezone.utc)
        )
        db.add(assignment)
        
        # B. Log Event
        log_exam_event(
            db,
            exam_id=exam_id,
            student_id=uid,
            teacher_id=current_user.id,
            event_type=EVENT_EXAM_ASSIGNED,
            triggered_by=TRIGGER_TEACHER
        )

        # C. Send Email
        student_user = db.query(User).filter(User.id == uid).first()
        if student_user and student_user.email:
            subject_line = f"New Exam Assigned: {exam.title}"
            email_body = get_exam_assigned_template(
                student_name=student_user.full_name,
                exam_title=exam.title,
                subject=exam.subject,
                deadline=exam.deadline.strftime("%Y-%m-%d %H:%M UTC") if exam.deadline else "No Deadline"
            )
            try:
                send_email(student_user.email, subject_line, email_body)
            except Exception as e:
                print(f"Failed to send email to {student_user.email}: {e}")
        
        assigned_count += 1

    db.commit()
    
    return {
        "status": "success", 
        "message": f"Assigned exam to {assigned_count} students",
        "assigned_count": assigned_count
    }

@router.post("/{exam_id}/submit")
async def submit_exam(
    exam_id: int,
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Validation: Role (Must be Student)
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can submit exams")

    # 2. Validation: Exam Existence and Type
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    # Only "subjective" exams allow file submission. "external" exams are just links (teacher handled?)
    # or external exams might not have submission here? 
    # Requirement: "student exam submission for subjective exams".
    if exam.exam_type != "subjective":
        raise HTTPException(status_code=400, detail="Submission only allowed for subjective exams")

    # 3. Validation: Deadline
    now = datetime.now(timezone.utc)
    if exam.deadline and now > exam.deadline:
         raise HTTPException(status_code=400, detail="Deadline has passed")

    # 4. Validation: Assignment Status
    # Must be assigned and NOT already submitted
    assignment = db.query(ExamAssignment).filter(
        ExamAssignment.exam_id == exam_id, 
        ExamAssignment.student_id == current_user.id
    ).first()
    
    if not assignment:
        raise HTTPException(status_code=403, detail="You are not assigned to this exam")
    
    if assignment.status != "assigned":
        # Could be "submitted", "checked", etc.
        raise HTTPException(status_code=400, detail="You have already submitted this exam or it is in a processed state")

    # 5. File Processing
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded")
        
    final_data = None
    mime_type = "application/octet-stream"
    upload_type = "single"

    try:
        if len(files) == 1 and files[0].content_type == "application/pdf":
            # Single PDF
            final_data = await files[0].read()
            mime_type = "application/pdf"
            upload_type = "pdf"
        else:
            # Multiple files or Images -> ZIP
            zip_buffer = io.BytesIO()
            with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
                for file in files:
                    content = await file.read()
                    # Use filename provided by client
                    zip_file.writestr(file.filename, content)
            
            final_data = zip_buffer.getvalue()
            mime_type = "application/zip"
            upload_type = "zip"
    except Exception as e:
         raise HTTPException(status_code=500, detail=f"Failed to process files: {str(e)}")

    # 6. Save Submission
    submission = ExamSubmission(
        exam_id=exam_id,
        student_id=current_user.id,
        answer_sheet_data=final_data,
        answer_sheet_mime=mime_type,
        upload_type=upload_type,
        submitted_at=now
    )
    db.add(submission)
    
    # 7. Update Assignment Status
    assignment.status = "submitted"
    
    # 8. Log Event
    log_exam_event(
        db,
        exam_id=exam_id,
        student_id=current_user.id,
        teacher_id=exam.teacher_id,
        event_type=EVENT_EXAM_SUBMITTED,
        triggered_by=TRIGGER_STUDENT
    )
    
    db.commit()

    return {"status": "success", "message": "Exam submitted successfully"}

class EvaluateExamRequest(BaseModel):
    marks: int
    feedback: str

@router.post("/{exam_id}/evaluate/{student_id}")
def evaluate_exam(
    exam_id: int,
    student_id: int,
    request: EvaluateExamRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Validation: Role (Must be Teacher)
    if current_user.role != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can evaluate exams")

    # 2. Validation: Exam ownership
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    if exam.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only evaluate your own exams")

    # 3. Validation: Marks limit
    if request.marks > exam.total_marks:
        raise HTTPException(status_code=400, detail=f"Marks cannot exceed total marks ({exam.total_marks})")

    # 4. Validation: Assignment Status (Must be submitted)
    assignment = db.query(ExamAssignment).filter(
        ExamAssignment.exam_id == exam_id, 
        ExamAssignment.student_id == student_id
    ).first()
    
    if not assignment:
        raise HTTPException(status_code=404, detail="Student is not assigned to this exam")
    
    if assignment.status != "submitted":
        raise HTTPException(status_code=400, detail="Exam is not submitted by student or already evaluated")

    # 5. Get Submission
    submission = db.query(ExamSubmission).filter(
        ExamSubmission.exam_id == exam_id,
        ExamSubmission.student_id == student_id
    ).first()
    
    if not submission:
        # Should not happen if status is submitted, but safe check
        raise HTTPException(status_code=404, detail="Submission record not found")

    # 6. Check if already evaluated (Double validation)
    existing_eval = db.query(ExamEvaluation).filter(ExamEvaluation.submission_id == submission.id).first()
    if existing_eval:
         raise HTTPException(status_code=400, detail="Exam already evaluated")

    # 7. Save Evaluation
    evaluation = ExamEvaluation(
        submission_id=submission.id,
        checked_by="teacher",
        marks=request.marks,
        feedback=request.feedback,
        is_final=True,
        checked_at=datetime.now(timezone.utc)
    )
    db.add(evaluation)
    
    # 8. Update Assignment Status
    assignment.status = "checked"
    
    # 9. Log Event
    log_exam_event(
        db,
        exam_id=exam_id,
        student_id=student_id,
        teacher_id=current_user.id,
        event_type=EVENT_EXAM_CHECKED,
        triggered_by=TRIGGER_TEACHER
    )

    # 10. Send Email
    student_user = db.query(User).filter(User.id == student_id).first()
    if student_user and student_user.email:
         email_subject = f"Exam Checked: {exam.title}"
         email_body = get_exam_checked_template(
             student_name=student_user.full_name,
             exam_title=exam.title,
             marks_obtained=request.marks,
             total_marks=exam.total_marks,
             feedback=request.feedback
         )
         try:
             send_email(student_user.email, email_subject, email_body)
         except Exception as e:
             # Log but don't fail transaction
             print(f"Failed to send exam check email: {e}")

    db.commit()

    return {"status": "success", "message": "Exam evaluated successfully"}

class RequestReevalRequest(BaseModel):
    reason: str

@router.post("/{exam_id}/request-reeval")
def request_reevaluation(
    exam_id: int,
    request: RequestReevalRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Validation: Role
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can request re-evaluation")

    # 2. Get Assignment
    assignment = db.query(ExamAssignment).filter(
        ExamAssignment.exam_id == exam_id,
        ExamAssignment.student_id == current_user.id
    ).first()
    
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    # 3. Status must be "checked"
    if assignment.status != "checked":
        raise HTTPException(status_code=400, detail="Exam must be checked before re-evaluation request")
        
    # 4. Check Duplicate Requests
    existing_req = db.query(ExamReevaluation).filter(ExamReevaluation.assignment_id == assignment.id).first()
    if existing_req:
        raise HTTPException(status_code=400, detail="Re-evaluation already requested")

    # 5. Create Request
    reeval = ExamReevaluation(
        assignment_id=assignment.id,
        reason=request.reason,
        requested_at=datetime.now(timezone.utc),
        resolved=False
    )
    db.add(reeval)
    
    # 6. Update Status
    assignment.status = "reeval_requested"
    
    # 7. Log Event
    log_exam_event(
        db,
        exam_id=exam_id,
        student_id=current_user.id,
        teacher_id=current_user.id, # Triggered by student? Actually current_user is student.
        # But log_exam_event requires teacher_id.
        # We need to fetch the exam to get the teacher_id to pass it correctly?
        # Let's fetch exam.
        event_type=EVENT_REEVAL_REQUESTED,
        triggered_by=TRIGGER_STUDENT
    )
    # Ah, wait. log_exam_event signature:
    # log_exam_event(db, exam_id, student_id, teacher_id, event_type, triggered_by)
    # The student triggers it. But we need teacher_id for the column properly? 
    # Or does the log function allow nullable teacher_id?
    # Checking models.py... teacher_id nullable=False in ExamEvent? 
    # Step 222 snippet: teacher_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    # So we MUST provide a valid teacher_id.
    
    # Fetch Exam to get teacher_id
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    # Re-call log with correct teacher_id
    log_exam_event(
        db,
        exam_id=exam_id,
        student_id=current_user.id,
        teacher_id=exam.teacher_id,
        event_type=EVENT_REEVAL_REQUESTED,
        triggered_by=TRIGGER_STUDENT
    )
    
    db.commit()
    return {"status": "success", "message": "Re-evaluation requested"}


@router.post("/{exam_id}/reevaluate/{student_id}")
def reevaluate_exam(
    exam_id: int,
    student_id: int,
    request: EvaluateExamRequest, # Re-use Evaluate marks/feedback model
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Validation: Role (Must be Teacher)
    if current_user.role != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can re-evaluate exams")

    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam or exam.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your exam")
        
    if request.marks > exam.total_marks:
        raise HTTPException(status_code=400, detail=f"Marks cannot exceed total marks ({exam.total_marks})")

    # 2. Get Assignment
    assignment = db.query(ExamAssignment).filter(
        ExamAssignment.exam_id == exam_id,
        ExamAssignment.student_id == student_id
    ).first()
    
    if not assignment or assignment.status != "reeval_requested":
        raise HTTPException(status_code=400, detail="Re-evaluation not requested for this student")

    # 3. Get Re-evaluation Request
    reeval_req = db.query(ExamReevaluation).filter(ExamReevaluation.assignment_id == assignment.id).first()
    if not reeval_req:
        raise HTTPException(status_code=404, detail="Re-evaluation request record not found")

    # 4. Get Previous Evaluation
    submission = db.query(ExamSubmission).filter(
        ExamSubmission.exam_id == exam_id,
        ExamSubmission.student_id == student_id
    ).first()
    
    evaluation = db.query(ExamEvaluation).filter(ExamEvaluation.submission_id == submission.id).first()
    if not evaluation:
         raise HTTPException(status_code=404, detail="Original evaluation not found")

    # 5. Update Evaluation
    evaluation.marks = request.marks
    evaluation.feedback = request.feedback
    # Keep checked_by as "teacher" or maybe update it? 
    # Or maybe create a new evaluation row? 
    # Requirement: "Update marks and feedback in exam_evaluations" -> implies update existing row.
    
    # 6. Resolve Request
    reeval_req.resolved = True
    
    # 7. Update Status
    assignment.status = "re_evaluated"
    
    # 8. Log Event
    log_exam_event(
        db,
        exam_id=exam_id,
        student_id=student_id,
        teacher_id=current_user.id,
        event_type=EVENT_EXAM_RE_EVALUATED,
        triggered_by=TRIGGER_TEACHER
    )

    # 9. Send Email
    student_user = db.query(User).filter(User.id == student_id).first()
    if student_user and student_user.email:
         email_subject = f"Re-evaluation Completed: {exam.title}"
         email_body = get_reeval_completed_template(
             student_name=student_user.full_name,
             exam_title=exam.title,
             final_marks=request.marks,
             total_marks=exam.total_marks
         )
         try:
             send_email(student_user.email, email_subject, email_body)
         except Exception as e:
             print(f"Failed to send re-eval email: {e}")

    db.commit()

    return {"status": "success", "message": "Re-evaluation completed"}

@router.post("/", response_model=dict)
async def create_exam(
    title: str = Form(...),
    subject: str = Form(...),
    instructions: str = Form(None),
    exam_type: str = Form(...), # subjective, external
    question_format: str = Form(None), # pdf, text (required if exam_type=subjective)
    question_source: str = Form(None), # teacher, ai (optional, default teacher)
    total_marks: int = Form(...),
    deadline: str = Form(...), # ISO format string
    external_link: str = Form(None),
    # For question_format=text
    questions_json: str = Form(None), # JSON string of list of objects {text, marks, order_no}
    # For question_format=pdf
    question_paper: UploadFile = File(None),
    
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Validation: Role check
    if current_user.role != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers can create exams"
        )
        
    # 2. Validation: Exam Type
    if exam_type not in ["subjective", "external"]:
        raise HTTPException(status_code=400, detail="Invalid exam_type. Must be 'subjective' or 'external'")
        
    # 3. Validation: External Exam
    if exam_type == "external":
        if not external_link:
            raise HTTPException(status_code=400, detail="external_link is required for external exams")
        question_format = None # force null
        question_paper = None
    
    # 4. Validation: Subjective Exam
    if exam_type == "subjective":
        if question_format not in ["pdf", "text"]:
             raise HTTPException(status_code=400, detail="question_format must be 'pdf' or 'text' for subjective exams")
             
        if question_format == "pdf":
            if not question_paper:
                 raise HTTPException(status_code=400, detail="question_paper file is required for pdf format")
        
        if question_format == "text":
            if not questions_json:
                 raise HTTPException(status_code=400, detail="questions_json is required for text format")

    # 5. Process Deadline to UTC
    # Expecting ISO 8601 string, e.g., "2023-10-27T10:00:00Z" or with offset
    # Ideally frontend sends UTC ISO string. We store as is (assuming models handle datetime or we parse it)
    # The DB model asks for DateTime(timezone=True). 
    # Let's try to parse it to ensure validity
    try:
        # replace Z with +00:00 to be safe for fromisoformat in older pythons if needed, 
        # but modern python handles it.
        deadline_dt = datetime.fromisoformat(deadline.replace('Z', '+00:00'))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid deadline format. Use ISO 8601")

    # 6. Read File Content if PDF
    paper_data = None
    paper_mime = None
    if question_paper:
        paper_data = await question_paper.read()
        paper_mime = question_paper.content_type

    # 7. Create Exam Record
    new_exam = Exam(
        teacher_id=current_user.id,
        title=title,
        subject=subject,
        instructions=instructions,
        exam_type=exam_type,
        question_format=question_format,
        question_source=question_source or "teacher",
        question_paper_data=paper_data,
        question_paper_mime=paper_mime,
        total_marks=total_marks,
        deadline=deadline_dt,
        external_link=external_link,
        # created_at is automatic
    )
    
    db.add(new_exam)
    db.flush() # flush to get new_exam.id

    # 8. Process Text Questions
    if exam_type == "subjective" and question_format == "text" and questions_json:
        try:
            questions_list = json.loads(questions_json)
            if not isinstance(questions_list, list) or len(questions_list) == 0:
                 raise HTTPException(status_code=400, detail="questions_json must be a non-empty list")
            
            for q in questions_list:
                # expecting { "question_text": "...", "marks": 5, "order_no": 1 }
                new_q = ExamQuestion(
                    exam_id=new_exam.id,
                    question_text=q.get("question_text"),
                    marks=q.get("marks", 0),
                    order_no=q.get("order_no", 0)
                )
                db.add(new_q)
                
        except json.JSONDecodeError:
            db.rollback()
            raise HTTPException(status_code=400, detail="Invalid JSON for questions_json")
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=400, detail=f"Error processing questions: {str(e)}")

    db.commit()
    db.refresh(new_exam)
    
    return {"status": "success", "exam_id": new_exam.id, "message": "Exam created successfully"}
