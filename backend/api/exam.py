from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from models import Exam, ExamSubmission, User, StudentTeacherFollow
from pydantic import BaseModel
from datetime import datetime
from auth import get_current_user
import os
import shutil

router = APIRouter()

# --- Pydantic Models ---

class ExamCreate(BaseModel):
    title: str
    instructions: str
    exam_type: str # fileupload, googleform
    duration_minutes: int
    deadline: str
    external_link: Optional[str] = None

class ExamResponse(BaseModel):
    id: int
    title: str
    instructions: Optional[str] = ""
    exam_type: Optional[str] = "fileupload"
    duration_minutes: Optional[int] = 60
    deadline: Optional[str] = ""
    external_link: Optional[str] = None
    created_at: Optional[str] = None
    
    class Config:
        from_attributes = True

class SubmissionResponse(BaseModel):
    id: int
    student_id: int
    submitted_at: str
    has_file: bool
    status: str
    marks_obtained: Optional[int] = None
    feedback: Optional[str] = None

# --- Endpoints ---

@router.get("/list/teacher", response_model=List[ExamResponse])
def list_exams_teacher(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "teacher":
         raise HTTPException(status_code=403, detail="Not authorized")
    
    if not current_user.teacher_profile:
        raise HTTPException(status_code=400, detail="Teacher profile not found")

    return db.query(Exam).filter(Exam.teacher_id == current_user.teacher_profile.id).all()

@router.get("/list/student") # Custom response to include status
def list_exams_student(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user.student_profile:
        raise HTTPException(status_code=400, detail="Student profile not found")
    student_id = current_user.student_profile.id

    # 1. Get followed teachers
    follows = db.query(StudentTeacherFollow.teacher_id).filter(StudentTeacherFollow.student_id == student_id).all()
    followed_ids = [f.teacher_id for f in follows]
    
    # 2. Fetch exams from followed teachers
    exams = db.query(Exam).filter(Exam.teacher_id.in_(followed_ids)).all()
    
    # 3. Check status for each
    results = []
    
    # Batch fetch submissions
    my_submissions = db.query(ExamSubmission).filter(
        ExamSubmission.student_id == student_id,
        ExamSubmission.exam_id.in_([e.id for e in exams])
    ).all()
    subs_map = {s.exam_id: s for s in my_submissions}
    
    for exam in exams:
        status = "pending"
        marks = None
        sub = subs_map.get(exam.id)
        if sub:
            status = sub.status # submitted, graded
            marks = sub.marks_obtained
            
        results.append({
            "exam": ExamResponse.model_validate(exam),
            "status": status,
            "marks": marks
        })
        
    return results

@router.post("/create")
def create_exam(
    title: str = Form(...),
    instructions: str = Form(...),
    exam_type: str = Form(...),
    duration_minutes: int = Form(...),
    deadline: str = Form(...),
    external_link: Optional[str] = Form(None),
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "teacher":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if not current_user.teacher_profile:
        raise HTTPException(status_code=400, detail="Teacher profile not found")
        
    new_exam = Exam(
        teacher_id=current_user.teacher_profile.id,
        title=title,
        instructions=instructions,
        exam_type=exam_type,
        duration_minutes=duration_minutes,
        deadline=deadline,
        external_link=external_link,
        created_at=datetime.now().isoformat(),
        date=datetime.now() # Legacy field
    )
    db.add(new_exam)
    db.commit()
    return {"message": "Exam created successfully"}

@router.post("/submit")
async def submit_exam(
    exam_id: int = Form(...),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user.student_profile:
        raise HTTPException(status_code=400, detail="Student profile not found")
    student_id = current_user.student_profile.id

    # Check if exam exists
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
        
    # Check existing submission
    existing = db.query(ExamSubmission).filter(ExamSubmission.exam_id == exam_id, ExamSubmission.student_id == student_id).first()
    if existing:
         submission = existing
         submission.submitted_at = datetime.now().isoformat()
    else:
        submission = ExamSubmission(
            exam_id=exam_id,
            student_id=student_id,
            submitted_at=datetime.now().isoformat(),
            status="submitted"
        )
        db.add(submission)
    
    # Handle File Upload
    if file:
        # Ensure upload dir
        UPLOAD_DIR = "uploads/exams"
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        
        # Unique filename
        file_ext = file.filename.split('.')[-1]
        filename = f"{exam_id}_{student_id}_{int(datetime.now().timestamp())}.{file_ext}"
        file_path = os.path.join(UPLOAD_DIR, filename)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        submission.file_path = file_path
    
    db.commit()
    return {"message": "Exam submitted successfully"}

@router.get("/submissions/{exam_id}")
def view_submissions(exam_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user.teacher_profile:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    # Verify ownership
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam or exam.teacher_id != current_user.teacher_profile.id:
         raise HTTPException(status_code=403, detail="Not authorized")
         
    submissions = db.query(ExamSubmission).filter(ExamSubmission.exam_id == exam_id).all()
    
    results = []
    for sub in submissions:
        student = db.query(User).filter(User.id == sub.student_id).first()
        results.append({
            "submission": {
                "id": sub.id,
                "student_id": sub.student_id,
                "has_file": bool(sub.file_path),
                "submitted_at": sub.submitted_at,
                "marks_obtained": sub.marks_obtained,
                "feedback": sub.feedback,
                "status": sub.status
            },
            "student_name": student.full_name if student else "Unknown",
            "student_email": student.email if student else ""
        })
        
    return results

@router.post("/grade")
def grade_submission(
    submission_id: int = Form(...),
    marks: int = Form(...),
    feedback: str = Form(""),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "teacher" or not current_user.teacher_profile:
         raise HTTPException(status_code=403, detail="Not authorized")
         
    sub = db.query(ExamSubmission).filter(ExamSubmission.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
        
    sub.marks_obtained = marks
    sub.feedback = feedback
    sub.status = "graded"
    
    db.commit()
    return {"message": "Graded successfully"}

# Dummy analyze endpoint to keep imports valid if used elsewhere? 
# The user's original file had it. I'll keep it or just replace it.
# The user prompt implied replacing global quiz broadcasting, but existing functionality should be preserved.
# The original endpoint /analyze seemed to be a demo. I'll include it just in case.
import random
import time
@router.post("/analyze")
async def analyze_exam(file: UploadFile = File(...)):
    # Simulate processing delay
    time.sleep(2)
    return {
        "filename": file.filename,
        "score": random.randint(65, 95),
         "total_marks": 100,
         "subject": "AI Analysis Mock"
    }

@router.get("/submission/{submission_id}/download")
def download_submission(submission_id: int, db: Session = Depends(get_db)):
    sub = db.query(ExamSubmission).filter(ExamSubmission.id == submission_id).first()
    if not sub or not sub.file_path or not os.path.exists(sub.file_path):
         raise HTTPException(status_code=404, detail="File not found")
         
    from fastapi.responses import FileResponse
    return FileResponse(sub.file_path)
