from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from database import get_db
from models import TeacherBatch, StudentBatchMap, Student, User
from auth import get_current_user
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()

# --- Dependencies ---

def get_current_teacher(current_user: User = Depends(get_current_user)):
    if current_user.role != "teacher" or not current_user.teacher_profile:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to teachers only"
        )
    return current_user.teacher_profile

# --- Pydantic Schemas ---

class BatchResponse(BaseModel):
    batch_id: int
    name: str
    is_default: bool
    student_count: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class StudentResponse(BaseModel):
    student_id: int
    full_name: Optional[str]
    username: str

    class Config:
        from_attributes = True

class MoveStudentRequest(BaseModel):
    target_batch_id: int

# --- Endpoints ---

@router.get("/", response_model=List[BatchResponse])
def list_teacher_batches(
    db: Session = Depends(get_db),
    teacher = Depends(get_current_teacher)
):
    """
    API 1: List Teacher Batches
    - Show all batches for a teacher with student count.
    - Order: default batch first, then others by creation time.
    """
    results = db.query(
        TeacherBatch,
        func.count(StudentBatchMap.student_id).label("student_count")
    ).outerjoin(
        StudentBatchMap,
        (TeacherBatch.id == StudentBatchMap.batch_id) & (StudentBatchMap.teacher_id == TeacherBatch.teacher_id)
    ).filter(
        TeacherBatch.teacher_id == teacher.id
    ).group_by(
        TeacherBatch.id
    ).order_by(
        TeacherBatch.is_default.desc(),
        TeacherBatch.created_at.desc()
    ).all()

    batches = []
    for batch, count in results:
        # NOTE: We do not change the batch name here, as it comes from DB. 
        # But we ensure our code comments refer to it as Default Batch.
        batches.append(BatchResponse(
            batch_id=batch.id,
            name=batch.name,
            is_default=batch.is_default,
            student_count=count,
            created_at=batch.created_at
        ))
    
    return batches

@router.get("/students", response_model=List[StudentResponse])
def list_students_by_batch(
    batch_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    teacher = Depends(get_current_teacher)
):
    """
    API 2: List Students by Batch
    - Load students for selected batch.
    - If batch_id not provided, use DEFAULT batch.
    """
    target_batch_id = batch_id

    if target_batch_id is None:
        # Find DEFAULT batch
        default_batch = db.query(TeacherBatch).filter(
            TeacherBatch.teacher_id == teacher.id,
            TeacherBatch.is_default == True
        ).first()
        
        if not default_batch:
            raise HTTPException(status_code=404, detail="Default batch not found for teacher")
        target_batch_id = default_batch.id
    
    if batch_id is not None:
        batch_check = db.query(TeacherBatch).filter(
            TeacherBatch.id == target_batch_id,
            TeacherBatch.teacher_id == teacher.id
        ).first()
        if not batch_check:
             raise HTTPException(status_code=404, detail="Batch not found")

    # Fetch students
    students = db.query(Student).join(
        StudentBatchMap,
        Student.id == StudentBatchMap.student_id
    ).filter(
        StudentBatchMap.batch_id == target_batch_id,
        StudentBatchMap.teacher_id == teacher.id
    ).all()

    return [
        StudentResponse(
            student_id=s.id,
            full_name=s.full_name,
            username=s.username
        ) for s in students
    ]

@router.patch("/students/{student_id}")
def move_student_to_batch(
    student_id: int,
    request: MoveStudentRequest,
    db: Session = Depends(get_db),
    teacher = Depends(get_current_teacher)
):
    """
    API 3: Move Student to Another Batch
    - Reassign a student to a different batch.
    """
    # 1. Validate Target Batch Ownership
    target_batch = db.query(TeacherBatch).filter(
        TeacherBatch.id == request.target_batch_id,
        TeacherBatch.teacher_id == teacher.id
    ).first()
    
    if not target_batch:
        raise HTTPException(status_code=404, detail="Target batch not found")
        
    # 2. Find the existing mapping for this student and teacher
    mapping = db.query(StudentBatchMap).filter(
        StudentBatchMap.student_id == student_id,
        StudentBatchMap.teacher_id == teacher.id
    ).first()
    
    if not mapping:
        raise HTTPException(status_code=404, detail="Student is not in your batches")
        
    # 3. Update if different
    if mapping.batch_id != request.target_batch_id:
        mapping.batch_id = request.target_batch_id
        db.commit()
        
    return {"message": "Student moved successfully"}
