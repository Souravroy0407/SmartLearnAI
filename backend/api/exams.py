from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional, List
import json
from datetime import datetime, timezone
from database import get_db
from models import User, Exam, ExamQuestion, ExamAssignment, StudentTeacherFollow, Student, ExamSubmission, ExamEvaluation, ExamReevaluation, ExamEvent
from auth import get_current_user
from utils.exam_logger import (
    log_exam_event, 
    EVENT_EXAM_ASSIGNED, 
    EVENT_EXAM_SUBMITTED, 
    EVENT_EXAM_CHECKED, 
    EVENT_REEVAL_REQUESTED,
    EVENT_EXAM_RE_EVALUATED,
    EVENT_DEADLINE_UPDATED,
    TRIGGER_TEACHER,
    TRIGGER_STUDENT,
    EVENT_ASSIGNMENT_REMOVED
)
import zipfile
import io
from utils.brevo_email import send_email
from utils.email_templates import get_exam_assigned_template, get_exam_checked_template, get_reeval_completed_template, get_exam_deadline_updated_template

from pydantic import BaseModel
from PIL import Image as PILImage

router = APIRouter()


class AssignExamRequest(BaseModel):
    assign_to_all: bool = False
    student_ids: List[int] = []

class UpdateExamRequest(BaseModel):
    title: Optional[str] = None
    instructions: Optional[str] = None
    new_deadline: Optional[str] = None # ISO format

class RollbackAssignmentsRequest(BaseModel):
    student_ids: List[int]

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
            "external_link": exam.external_link,
            "instructions": exam.instructions
        })
    return results


@router.get("/my-exams", response_model=List[dict])
def get_student_my_exams(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Validation: Role
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can view their assigned exams")

    # 2. Fetch Assignments for this student
    assignments = db.query(ExamAssignment).filter(
        ExamAssignment.student_id == current_user.id
    ).order_by(ExamAssignment.assigned_at.desc()).all()
    
    results = []
    for assignment in assignments:
        # 3. Fetch Exam Details
        exam = db.query(Exam).filter(Exam.id == assignment.exam_id).first()
        if exam:
            results.append({
                "id": exam.id,
                "title": exam.title,
                "subject": exam.subject,
                "exam_type": exam.exam_type, # subjective, external
                "total_marks": exam.total_marks,
                "deadline": exam.deadline,
                "instructions": exam.instructions,
                "status": assignment.status, # assigned, submitted, checked, reeval_requested, re_evaluated
                "assigned_at": assignment.assigned_at,
                "submitted_at": None, 
                "marks_obtained": None
            })
            
            # Fetch submission/evaluation if available
            if assignment.status in ["submitted", "checked", "reeval_requested", "re_evaluated"]:
                # Find submission
                submission = db.query(ExamSubmission).filter(
                    ExamSubmission.exam_id == exam.id,
                    ExamSubmission.student_id == current_user.id
                ).first()
                if submission:
                    results[-1]["submitted_at"] = submission.submitted_at
                     # Find evaluation if checked/reeval
                    if assignment.status in ["checked", "reeval_requested", "re_evaluated"]:
                        evaluation = db.query(ExamEvaluation).filter(ExamEvaluation.submission_id == submission.id).first()
                        if evaluation:
                             results[-1]["marks_obtained"] = evaluation.marks
    
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
            # Format Deadline: "Jan 14, 2:59 PM UTC"
            formatted_deadline = "No Deadline"
            if exam.deadline:
                # Ensure UTC awareness if missing
                dt = exam.deadline
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                
                # Convert to System Local Time for Email (User perspective)
                local_dt = dt.astimezone()
                formatted_deadline = local_dt.strftime("%b %d, %I:%M %p")

            subject_line = f"New Exam Assigned: {exam.title}"
            email_body = get_exam_assigned_template(
                student_name=student_user.full_name,
                exam_title=exam.title,
                subject=exam.subject,
                deadline=formatted_deadline,
                teacher_name=current_user.full_name,
                total_marks=exam.total_marks
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
    files: List[UploadFile] = File(None), # Optional now
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
    
    # 3. Validation: Deadline
    now = datetime.now(timezone.utc)
    if exam.deadline:
         # Ensure exam.deadline is timezone aware
         deadline_dt = exam.deadline
         if deadline_dt.tzinfo is None:
             deadline_dt = deadline_dt.replace(tzinfo=timezone.utc)
             
         if now > deadline_dt:
             raise HTTPException(status_code=400, detail="Deadline has passed")

    # 4. Validation: Assignment Status
    assignment = db.query(ExamAssignment).filter(
        ExamAssignment.exam_id == exam_id, 
        ExamAssignment.student_id == current_user.id
    ).first()
    
    if not assignment:
        raise HTTPException(status_code=403, detail="You are not assigned to this exam")
    
    if assignment.status != "assigned":
        raise HTTPException(status_code=400, detail="You have already submitted this exam or it is in a processed state")

    final_data = None
    mime_type = None
    upload_type = "external_link" # default for external

    # 5. Logic based on Exam Type
    if exam.exam_type == "subjective":
        if not files:
             raise HTTPException(status_code=400, detail="No files uploaded for subjective exam")
        
        upload_type = "pdf"
        mime_type = "application/pdf"
        
        try:
            # Check if first file is PDF (Single PDF Submission)
            if len(files) == 1 and files[0].content_type == "application/pdf":
                final_data = await files[0].read()
            else:
                # Multiple files or Images -> Convert to Single PDF
                images = []
                for file in files:
                    content = await file.read()
                    if not file.content_type.startswith("image/"):
                        raise HTTPException(status_code=400, detail=f"File {file.filename} is not an image. Only Images or a single PDF are allowed.")
                    
                    try:
                        img = PILImage.open(io.BytesIO(content))
                        if img.mode != 'RGB':
                            img = img.convert('RGB')
                        images.append(img)
                    except Exception as e:
                        raise HTTPException(status_code=400, detail=f"Invalid image file {file.filename}")

                if not images:
                     raise HTTPException(status_code=400, detail="No valid images found to convert")

                # Save to PDF
                pdf_buffer = io.BytesIO()
                images[0].save(
                    pdf_buffer, 
                    "PDF", 
                    resolution=100.0, 
                    save_all=True, 
                    append_images=images[1:]
                )
                final_data = pdf_buffer.getvalue()
                
        except HTTPException:
            raise
        except Exception as e:
             print(f"File processing error: {e}")
             raise HTTPException(status_code=500, detail="Failed to process files. Ensure you are uploading valid PDFs or Images.")
    
    elif exam.exam_type == "external":
        # External exams don't need files. Just "Mark as Completed".
        # We can store a dummy or empty submission record.
        upload_type = "external_completed"
        # final_data remains None or checks DB schema constraint? 
        # LargeBinary is nullable in models? 
        # Checking logic: `answer_sheet_data = Column(LargeBinary)` -> Nullable by default (unless nullable=False specified)
        # Checking models.py snippet provided earlier: `answer_sheet_data = Column(LargeBinary)` 
        # Does not say nullable=False. So None allows.
        pass

    else:
        raise HTTPException(status_code=400, detail="Invalid exam type for submission")

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

    # Check exam type - Disable re-eval for external exams
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    if exam.exam_type == "external":
        raise HTTPException(status_code=400, detail="Re-evaluation is not available for external exams")

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
    try:
        # replace Z with +00:00 to be safe for fromisoformat in older pythons if needed
        deadline_dt = datetime.fromisoformat(deadline.replace('Z', '+00:00'))
        
        # Ensure it's timezone-aware (assume UTC if not)
        if deadline_dt.tzinfo is None:
            deadline_dt = deadline_dt.replace(tzinfo=timezone.utc)
            
        # Check against now
        if deadline_dt < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="Deadline must be in the future")
            
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


@router.get("/{exam_id}/student-access")
def get_student_exam_details(
    exam_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Validation: Role
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can access this endpoint")

    # 2. Check Assignment
    assignment = db.query(ExamAssignment).filter(
        ExamAssignment.exam_id == exam_id,
        ExamAssignment.student_id == current_user.id
    ).first()

    if not assignment:
        raise HTTPException(status_code=403, detail="You are not assigned to this exam")

    # 3. Get Exam
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    # 4. Construct Response
    # If text format, include questions
    questions = []
    if exam.question_format == "text":
        qs = db.query(ExamQuestion).filter(ExamQuestion.exam_id == exam_id).order_by(ExamQuestion.order_no).all()
        questions = [
            {
                "id": q.id,
                "question_text": q.question_text,
                "marks": q.marks,
                "order_no": q.order_no
            }
            for q in qs
        ]

    final_response = {
        "id": exam.id,
        "title": exam.title,
        "subject": exam.subject,
        "instructions": exam.instructions,
        "total_marks": exam.total_marks,
        "deadline": exam.deadline,
        "exam_type": exam.exam_type,
        "question_format": exam.question_format,
        "external_link": exam.external_link,
        "status": assignment.status,
        "questions": questions,
        "marks_obtained": None,
        "feedback": None,
        "reeval_reason": None,
        "submitted_at": None
    }

    # Fetch Submission
    submission = db.query(ExamSubmission).filter(
        ExamSubmission.exam_id == exam_id,
        ExamSubmission.student_id == current_user.id
    ).first()

    if submission:
        final_response["submitted_at"] = submission.submitted_at
        evaluation = db.query(ExamEvaluation).filter(ExamEvaluation.submission_id == submission.id).first()
        if evaluation:
            final_response["marks_obtained"] = evaluation.marks
            final_response["feedback"] = evaluation.feedback
    
    if assignment.status in ["reeval_requested", "re_evaluated"]:
         reeval = db.query(ExamReevaluation).filter(ExamReevaluation.assignment_id == assignment.id).first()
         if reeval:
             final_response["reeval_reason"] = reeval.reason
             
    return final_response


from fastapi.responses import StreamingResponse


@router.patch("/{exam_id}")
def update_exam(
    exam_id: int,
    request: UpdateExamRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Validation: Role
    if current_user.role != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can update exams")

    # 2. Validation: Exam ownership
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    if exam.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only update your own exams")

    deadline_changed = False
    if request.new_deadline:
        # 3. Validation: Deadline (Future or Current)
        try:
            deadline_dt = datetime.fromisoformat(request.new_deadline.replace('Z', '+00:00'))
            if deadline_dt.tzinfo is None:
                deadline_dt = deadline_dt.replace(tzinfo=timezone.utc)
                
            # Allow shortening/extending as per requirements
            # We skip the future check if it was already in the past? 
            # Requirements say "extend allowed, shortening allowed".
            # I will allow any future deadline.
            if deadline_dt < datetime.now(timezone.utc):
                 raise HTTPException(status_code=400, detail="New deadline must be in the future")
                 
            if exam.deadline != deadline_dt:
                exam.deadline = deadline_dt
                deadline_changed = True
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid deadline format")

    if request.title:
        exam.title = request.title
    if request.instructions is not None:
        exam.instructions = request.instructions

    # 5. Log Event if anything changed
    log_exam_event(
        db,
        exam_id=exam_id,
        student_id=current_user.id,
        teacher_id=current_user.id,
        event_type=EVENT_DEADLINE_UPDATED, # Re-using this event for general updates
        triggered_by=TRIGGER_TEACHER
    )
    
    # 6. Notify Students ONLY if deadline changed (as per prompt implication)
    count = 0
    if deadline_changed:
        assignments = db.query(ExamAssignment).filter(ExamAssignment.exam_id == exam_id).all()
        formatted_deadline = exam.deadline.astimezone().strftime("%b %d, %I:%M %p")
        
        for assignment in assignments:
            student_user = db.query(User).filter(User.id == assignment.student_id).first()
            if student_user and student_user.email:
                 # Send Email
                 subject_line = f"Exam Deadline Updated: {exam.title}"
                 email_body = get_exam_deadline_updated_template(
                     student_name=student_user.full_name,
                     exam_title=exam.title,
                     new_deadline=formatted_deadline,
                     teacher_name=current_user.full_name
                 )
                 try:
                     send_email(student_user.email, subject_line, email_body)
                     count += 1
                 except Exception:
                     pass
                     
    db.commit()
    
    msg = "Exam updated successfully"
    if deadline_changed:
        msg = f"Deadline updated and {count} students notified"
    
    return {"status": "success", "message": msg}


@router.get("/{exam_id}/download-paper")
def download_exam_paper(
    exam_id: int,
    disposition: str = "inline", # inline or attachment
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Validation: Role
    # Allow both student (assigned) and teacher (owner)
    
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    if current_user.role == "student":
         # Check assignment
         assignment = db.query(ExamAssignment).filter(
            ExamAssignment.exam_id == exam_id,
            ExamAssignment.student_id == current_user.id
         ).first()
         if not assignment:
             raise HTTPException(status_code=403, detail="Access denied")
    elif current_user.role == "teacher":
        if exam.teacher_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
    else:
        # Admin or others?
        raise HTTPException(status_code=403, detail="Access denied")

    if not exam.question_paper_data:
        raise HTTPException(status_code=404, detail="No question paper file found")

    # Return stream
    # Ensure PDF mime type (if we are confident it is PDF, otherwise trust DB)
    media_type = exam.question_paper_mime or "application/pdf"
    
    # Check for "disposition" query param? Not standard in FastAPI to read param in signature unless defined
    # Let's add it to signature if we want to support it, or just default to inline now.
    # Frontend wants Preview (inline) and Download (attachment).
    # Since we can't easily change signature w/o breaking potential callers? 
    # Actually we can add optional param.
    return StreamingResponse(
        io.BytesIO(exam.question_paper_data),
        media_type=media_type,
        headers={
            "Content-Disposition": f'{disposition}; filename="Exam_{exam.id}_Paper.pdf"'
        }
    )





@router.get("/{exam_id}/submissions", response_model=List[dict])
def get_exam_submissions(
    exam_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Validation: Role
    if current_user.role != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can view submissions")

    # 2. Validation: Exam ownership
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    if exam.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only view submissions for your own exams")

    # 3. Fetch Data
    # Get all assignments for this exam
    assignments = db.query(ExamAssignment).filter(ExamAssignment.exam_id == exam_id).all()
    
    results = []
    for assignment in assignments:
        student = db.query(User).filter(User.id == assignment.student_id).first()
        if not student:
            continue
            
        submission = db.query(ExamSubmission).filter(
            ExamSubmission.exam_id == exam_id,
            ExamSubmission.student_id == assignment.student_id
        ).first()
        
        evaluation = None
        if submission:
             evaluation = db.query(ExamEvaluation).filter(ExamEvaluation.submission_id == submission.id).first()
             
        results.append({
            "student_id": student.id,
            "student_name": student.full_name,
            "student_email": student.email,
            "status": assignment.status, # assigned, submitted, checked, reeval_requested, re_evaluated
            "assigned_at": assignment.assigned_at,
            "submitted_at": submission.submitted_at if submission else None,
            "marks_obtained": evaluation.marks if evaluation else None,
            "feedback": evaluation.feedback if evaluation else None,
            "is_evaluated": evaluation is not None,
            # Re-evaluation Data
            "reeval_reason": None
        })

        if assignment.status in ["reeval_requested", "re_evaluated"]:
             reeval = db.query(ExamReevaluation).filter(ExamReevaluation.assignment_id == assignment.id).first()
             if reeval:
                 results[-1]["reeval_reason"] = reeval.reason
        
    return results


@router.get("/{exam_id}/submissions/{student_id}/download-answer")
def download_student_answer(
    exam_id: int,
    student_id: int,
    disposition: str = "inline",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Validation: Role
    if current_user.role != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can download answer sheets")

    # 2. Validation: Exam ownership
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    if exam.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only download answers for your own exams")

    # 3. Fetch Submission
    submission = db.query(ExamSubmission).filter(
        ExamSubmission.exam_id == exam_id,
        ExamSubmission.student_id == student_id
    ).first()
    
    if not submission or not submission.answer_sheet_data:
        raise HTTPException(status_code=404, detail="Submission or file not found")

    # 4. Determine Filename
    # Get student name for filename
    student = db.query(User).filter(User.id == student_id).first()
    student_name = student.full_name.replace(" ", "_") if student else f"Student_{student_id}"
    
    # Force PDF extension logic if we converted everything?
    # Old data might be ZIP. We need to handle that.
    ext = "pdf"
    mime = submission.answer_sheet_mime or "application/pdf"
    
    if submission.upload_type == "zip" or mime == "application/zip":
        ext = "zip"
    
    filename = f"Exam_{exam_id}_{student_name}_Answer.{ext}"

    # 5. Return Stream
    return StreamingResponse(
        io.BytesIO(submission.answer_sheet_data),
        media_type=mime,
        headers={"Content-Disposition": f'{disposition}; filename="{filename}"'}
    )

@router.get("/{exam_id}/evaluation/{student_id}")
def get_evaluation_metadata(
    exam_id: int,
    student_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Optimized endpoint for Teacher Evaluation Page.
    Returns only metadata, avoiding heavy file payloads.
    """
    # 1. Validation: Role
    if current_user.role != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can access evaluation data")

    # 2. Get Exam & Check Ownership
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    if exam.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    # 3. Get Student Name
    student = db.query(User).filter(User.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # 4. Get Submission
    submission = db.query(ExamSubmission).filter(
        ExamSubmission.exam_id == exam_id, 
        ExamSubmission.student_id == student_id
    ).first()

    if not submission:
        # If no submission exists, return 404 cleanly
        raise HTTPException(status_code=404, detail="Submission not found")

    # 5. Get Assignment (Source of Truth for Status)
    assignment = db.query(ExamAssignment).filter(
        ExamAssignment.exam_id == exam_id,
        ExamAssignment.student_id == student_id
    ).first()

    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment record not found")

    # 6. Get Evaluation & Re-evaluation info
    evaluation = db.query(ExamEvaluation).filter(ExamEvaluation.submission_id == submission.id).first()
    
    reeval_reason = None
    # Check for re-eval request
    reeval = db.query(ExamReevaluation).filter(ExamReevaluation.assignment_id == assignment.id).first()
    if reeval:
         reeval_reason = reeval.reason

    return {
        "exam": {
            "id": exam.id,
            "title": exam.title,
            "total_marks": exam.total_marks,
            "question_format": exam.question_format,
            "has_question_paper": bool(exam.question_paper_data),
            "exam_type": exam.exam_type,
            "external_link": exam.external_link,
            "questions": [
                {"id": q.id, "order_no": q.order_no, "question_text": q.question_text, "marks": q.marks}
                for q in db.query(ExamQuestion).filter(ExamQuestion.exam_id == exam.id).order_by(ExamQuestion.order_no).all()
            ] if exam.question_format == "text" else []
        },
        "submission": {
            "student_name": student.full_name,
            "submitted_at": submission.submitted_at,
            "status": assignment.status, # CORRECT: Use Assignment status
            "has_answer_sheet": bool(submission.answer_sheet_data),
            "reeval_reason": reeval_reason
        },
        "evaluation": {
            "marks": evaluation.marks if evaluation else None,
            "feedback": evaluation.feedback if evaluation else None
        }
    }

@router.delete("/{exam_id}")
def delete_exam(
    exam_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Validation: Role
    if current_user.role != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can delete exams")

    # 2. Validation: Exam ownership
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    if exam.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own exams")

    try:
        # 3. Strict Deletion Order (MANDATORY for FK constraints)
        
        # A. Delete Exam Events (Logs)
        db.query(ExamEvent).filter(ExamEvent.exam_id == exam_id).delete(synchronize_session=False)

        # Get relevant IDs for nested deletions
        assignments = db.query(ExamAssignment).filter(ExamAssignment.exam_id == exam_id).all()
        assignment_ids = [a.id for a in assignments]
        
        submissions = db.query(ExamSubmission).filter(ExamSubmission.exam_id == exam_id).all()
        submission_ids = [s.id for s in submissions]

        # B. Delete Exam Re-evaluations (Linked to Assignments)
        if assignment_ids:
            db.query(ExamReevaluation).filter(ExamReevaluation.assignment_id.in_(assignment_ids)).delete(synchronize_session=False)

        # C. Delete Exam Evaluations (Linked to Submissions)
        if submission_ids:
            db.query(ExamEvaluation).filter(ExamEvaluation.submission_id.in_(submission_ids)).delete(synchronize_session=False)

        # D. Delete Exam Submissions
        db.query(ExamSubmission).filter(ExamSubmission.exam_id == exam_id).delete(synchronize_session=False)

        # E. Delete Exam Assignments
        db.query(ExamAssignment).filter(ExamAssignment.exam_id == exam_id).delete(synchronize_session=False)

        # F. Delete Exam Questions
        db.query(ExamQuestion).filter(ExamQuestion.exam_id == exam_id).delete(synchronize_session=False)

        # G. Delete Exam Record (FINAL)
        db.delete(exam)
        
        db.commit()
        return {"status": "success", "message": "Exam deleted successfully"}

    except Exception as e:
        db.rollback()
        print(f"Delete exam failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete exam. Please try again.")


@router.post("/{exam_id}/rollback-assignments")
def rollback_assignments(
    exam_id: int,
    request: RollbackAssignmentsRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Validation: Role
    if current_user.role != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can rollback assignments")

    # 2. Validation: Exam ownership
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    if exam.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only rollback assignments for your own exams")

    try:
        rolled_back_count = 0
        errors = []
        
        # Iterate through student IDs (which are User IDs)
        for student_user_id in request.student_ids:
            # A. Resolve Student (Verify validity)
            student_profile = db.query(Student).filter(Student.user_id == student_user_id).first()
            if not student_profile:
                # Invalid student ID passed
                print(f"Rollback Warning: User ID {student_user_id} is not a valid student.")
                continue

            # B. Find Assignment (Strict match on exam_id and student_id=user_id)
            assignment = db.query(ExamAssignment).filter(
                ExamAssignment.exam_id == exam_id,
                ExamAssignment.student_id == student_user_id 
            ).first()
            
            if not assignment:
                # Not assigned, skip
                continue

            # C. Check if SUBMITTED (Strict rule: Cannot rollback if submitted)
            # Alternatively, requirement says: "If no row deleted -> return explicit error". 
            # But we also have a rule "Student exam list API is still reading stale assignments".
            # We must Ensure we are deleting the right row.
            
            # Check submission to be safe (prevent data loss of answers)
            submission = db.query(ExamSubmission).filter(
                ExamSubmission.exam_id == exam_id,
                ExamSubmission.student_id == student_user_id
            ).first()
            
            if submission:
                errors.append(f"Student {student_user_id} has already submitted. Cannot rollback.")
                continue
            
            # D. HARD DELETE Assignment
            db.delete(assignment)
            
            # E. Log the rollback action
            log_exam_event(
                db,
                exam_id=exam_id,
                student_id=student_user_id,
                teacher_id=current_user.id,
                event_type=EVENT_ASSIGNMENT_REMOVED,
                triggered_by=TRIGGER_TEACHER
            )

            rolled_back_count += 1
            
        if rolled_back_count == 0 and errors:
             # If we failed all due to logic, raise
             raise HTTPException(status_code=400, detail=f"Rollback failed: {', '.join(errors)}")
        
        if rolled_back_count == 0 and not errors:
             # Just nothing changed
             pass 

        db.commit()
        
        print(f"Rollback Success: Removed {rolled_back_count} assignments for Exam {exam_id}.")
        return {
            "status": "success", 
            "message": f"Successfully unassigned {rolled_back_count} student(s)",
            "rolled_back_count": rolled_back_count
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Rollback CRITICAL FAILURE: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to rollback assignment due to server error")
