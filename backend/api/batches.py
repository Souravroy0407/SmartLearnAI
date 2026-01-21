from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from database import get_db
from models import TeacherBatch, StudentBatchMap, Student, User
from auth import get_current_user
from pydantic import BaseModel
from datetime import datetime, time
from utils.brevo_email import send_email
from utils.email_templates import get_batch_announcement_template

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
    description: Optional[str] = None
    is_default: bool
    student_count: int
    created_at: Optional[datetime] = None
    # New Fields
    run_days: Optional[List[str]] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    timezone: Optional[str] = None
    status: str = "active"

    class Config:
        from_attributes = True

class StudentResponse(BaseModel):
    student_id: int
    full_name: Optional[str]
    username: str

    class Config:
        from_attributes = True

class CreateBatchRequest(BaseModel):
    name: str
    description: Optional[str] = None
    run_days: Optional[List[str]] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    timezone: Optional[str] = None
    status: Optional[str] = "active"

class UpdateBatchRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    run_days: Optional[List[str]] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    timezone: Optional[str] = None
    status: Optional[str] = None

class MoveStudentRequest(BaseModel):
    target_batch_id: int

class AnnounceRequest(BaseModel):
    message: str

class FailedRecipient(BaseModel):
    student_id: int
    name: str # Using name as requested by user ("student name who are responsible for thie fail")
    reason: str

class AnnounceResponse(BaseModel):
    total_students: int
    sent_count: int
    failed_count: int
    failed_recipients: List[FailedRecipient]
    message: str

# --- In-Memory Rate Limiter ---
# Dictionary to store timestamps of announcements: { batch_id: [datetime, datetime, ...] }
# Cleaning logic: We will filter old timestamps on every check.
ANNOUNCEMENT_LIMITS = {} 
MAX_ANNOUNCEMENTS_PER_DAY = 5

def check_rate_limit(batch_id: int):
    now = datetime.now()
    if batch_id not in ANNOUNCEMENT_LIMITS:
        ANNOUNCEMENT_LIMITS[batch_id] = []
    
    # Filter out timestamps older than 24 hours
    ANNOUNCEMENT_LIMITS[batch_id] = [
        t for t in ANNOUNCEMENT_LIMITS[batch_id] 
        if (now - t).total_seconds() < 86400
    ]
    
    if len(ANNOUNCEMENT_LIMITS[batch_id]) >= MAX_ANNOUNCEMENTS_PER_DAY:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Daily announcement limit reached ({MAX_ANNOUNCEMENTS_PER_DAY} per day)."
        )
    
    # Record this attempt (we'll count it even if it fails partially, to prevent spamming attempts)
    ANNOUNCEMENT_LIMITS[batch_id].append(now)

# --- Endpoints ---

@router.post("/", response_model=BatchResponse)
def create_batch(
    request: CreateBatchRequest,
    db: Session = Depends(get_db),
    teacher = Depends(get_current_teacher)
):
    """
    API 4: Create New Batch
    """
    # 1. Validation: Time Logic
    if request.start_time or request.end_time:
        if not (request.start_time and request.end_time):
             raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Both start_time and end_time must be provided if one is set."
            )
        if request.end_time <= request.start_time:
             raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="End time must be after start time."
            )

    # 2. Check for duplicate name
    existing = db.query(TeacherBatch).filter(
        TeacherBatch.teacher_id == teacher.id,
        TeacherBatch.name == request.name
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Batch with this name already exists"
        )
        
    # 3. Create Batch
    new_batch = TeacherBatch(
        teacher_id=teacher.id,
        name=request.name,
        description=request.description,
        is_default=False,
        # New Fields
        run_days=request.run_days,
        start_time=request.start_time,
        end_time=request.end_time,
        timezone=request.timezone,
        status=request.status or "active"
    )
    db.add(new_batch)
    db.commit()
    db.refresh(new_batch)
    
    return BatchResponse(
        batch_id=new_batch.id,
        name=new_batch.name,
        description=new_batch.description,
        is_default=new_batch.is_default,
        student_count=0,
        created_at=new_batch.created_at,
        # Response Mapping
        run_days=new_batch.run_days,
        start_time=new_batch.start_time,
        end_time=new_batch.end_time,
        timezone=new_batch.timezone,
        status=new_batch.status
    )

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
            description=batch.description,
            is_default=batch.is_default,
            student_count=count,
            created_at=batch.created_at,
            # New Fields
            run_days=batch.run_days,
            start_time=batch.start_time,
            end_time=batch.end_time,
            timezone=batch.timezone,
            status=batch.status
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
        
    # 2. Check Lifecycle Status (New Phase 2 Requirement)
    if not target_batch.is_default and target_batch.status in ["paused", "completed"]:
         raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot move student to a {target_batch.status} batch."
        )
        
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

@router.delete("/{batch_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_batch(
    batch_id: int,
    db: Session = Depends(get_db),
    teacher = Depends(get_current_teacher)
):
    """
    API 5: Delete Batch
    - ATOMIC: Move all students to Default Batch -> Delete Batch.
    - Fails if batch is default.
    - Fails if batch not found or not owned by teacher.
    """
    # 1. Fetch batch to be deleted
    batch_to_delete = db.query(TeacherBatch).filter(
        TeacherBatch.id == batch_id,
        TeacherBatch.teacher_id == teacher.id
    ).first()

    if not batch_to_delete:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Batch not found"
        )

    # 2. Check if default
    if batch_to_delete.is_default:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete the default batch"
        )

    # 3. Fetch Default Batch (Destination)
    default_batch = db.query(TeacherBatch).filter(
        TeacherBatch.teacher_id == teacher.id,
        TeacherBatch.is_default == True
    ).first()

    if not default_batch:
        # Should technically never happen due to DB constraints but good safety
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Default batch not found, cannot reassign students."
        )

    try:
        # 4. Reassign all students from this batch to Default Batch
        # We do this using a bulk update for efficiency
        db.query(StudentBatchMap).filter(
            StudentBatchMap.batch_id == batch_id,
            StudentBatchMap.teacher_id == teacher.id
        ).update(
            {StudentBatchMap.batch_id: default_batch.id},
            synchronize_session=False
        )

        # 5. Delete the batch
        db.delete(batch_to_delete)
        
        # 6. Commit Transaction
        db.commit()

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete batch: {str(e)}"
        )

@router.patch("/{batch_id}", response_model=BatchResponse)
def update_batch(
    batch_id: int,
    request: UpdateBatchRequest,
    db: Session = Depends(get_db),
    teacher = Depends(get_current_teacher)
):
    """
    API 6: Update Batch (Name, Schedule, Lifecycle)
    - Validates ownership.
    - Default Batch: Can ONLY update description.
    - Schedule Validation: start_time and end_time must be consistent.
    """
    # 1. Fetch Batch
    batch = db.query(TeacherBatch).filter(
        TeacherBatch.id == batch_id,
        TeacherBatch.teacher_id == teacher.id
    ).first()

    if not batch:
         raise HTTPException(status_code=404, detail="Batch not found")

    # 2. Default Batch Rules
    if batch.is_default:
        # Forbidden fields for default batch
        if any([request.run_days, request.start_time, request.end_time, request.status, request.timezone]):
             raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Cannot update schedule or status for the Default Batch."
            )
    
    # 3. Schedule Validation (if provided)
    if request.start_time or request.end_time:
         if not (request.start_time and request.end_time):
             # Enforce payload consistency
             if not (request.start_time and request.end_time):
                raise HTTPException(
                    status_code=400, 
                    detail="Both start_time and end_time must be provided to update schedule."
                )
         
         if request.end_time <= request.start_time:
              raise HTTPException(status_code=400, detail="End time must be after start time.")

    # 4. Apply Updates
    if request.name is not None:
        # Check duplicate if name changed
        if request.name != batch.name:
             existing = db.query(TeacherBatch).filter(
                TeacherBatch.teacher_id == teacher.id,
                TeacherBatch.name == request.name
             ).first()
             if existing:
                 raise HTTPException(status_code=400, detail="Batch name already exists")
        batch.name = request.name

    if request.description is not None:
        batch.description = request.description

    # Only apply these if NOT default
    if not batch.is_default:
        if request.run_days is not None:
            batch.run_days = request.run_days
        if request.start_time is not None:
            batch.start_time = request.start_time
        if request.end_time is not None:
            batch.end_time = request.end_time
        if request.timezone is not None:
            batch.timezone = request.timezone
        if request.status is not None:
            batch.status = request.status
            
    db.commit()
    db.refresh(batch)
    
    # 5. Return Response
    student_count = db.query(func.count(StudentBatchMap.student_id))\
        .filter(StudentBatchMap.batch_id == batch.id, StudentBatchMap.teacher_id == teacher.id)\
        .scalar()

    return BatchResponse(
        batch_id=batch.id,
        name=batch.name,
        description=batch.description,
        is_default=batch.is_default,
        student_count=student_count or 0,
        created_at=batch.created_at,
        run_days=batch.run_days,
        start_time=batch.start_time,
        end_time=batch.end_time,
        timezone=batch.timezone,
        status=batch.status
    )

    return BatchResponse(
        batch_id=batch.id,
        name=batch.name,
        description=batch.description,
        is_default=batch.is_default,
        student_count=student_count or 0,
        created_at=batch.created_at,
        run_days=batch.run_days,
        start_time=batch.start_time,
        end_time=batch.end_time,
        timezone=batch.timezone,
        status=batch.status
    )


@router.post("/{batch_id}/announce", response_model=AnnounceResponse)
def send_batch_announcement(
    batch_id: int,
    request: AnnounceRequest,
    db: Session = Depends(get_db),
    teacher = Depends(get_current_teacher)
):
    """
    API 7: Send Stateless Announcement (Email Broadcast)
    - Validates batch ownership and status (Active only).
    - Rate Limit: Max 5 per day (In-Memory).
    - Sends individual emails via Brevo.
    - Returns detailed summary of failures.
    """
    # 0. Validate Request Body
    if not request.message or len(request.message) > 500:
        raise HTTPException(status_code=400, detail="Message must be between 1 and 500 characters.")

    # 1. Fetch Batch
    batch = db.query(TeacherBatch).filter(
        TeacherBatch.id == batch_id,
        TeacherBatch.teacher_id == teacher.id
    ).first()

    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
        
    # 2. Status Check
    if batch.status != "active" and not batch.is_default: # Default batch technically has no status field exposed usually as active, but good to check. Actually DB defaults status='active'.
        # Wait, models.py says status default='active'.
        # But if user Paused the batch, we should block.
        # "Disable button if batch is paused or completed" -> Enforce in backend too.
        raise HTTPException(status_code=400, detail=f"Cannot announce to {batch.status} batch.")

    # 3. Rate Limit Check
    check_rate_limit(batch.id)

    # 4. Fetch Students
    students = db.query(
        Student.id, 
        Student.full_name, 
        User.email
    ).join(
        StudentBatchMap, Student.id == StudentBatchMap.student_id
    ).join(
        User, Student.user_id == User.id
    ).filter(
        StudentBatchMap.batch_id == batch.id,
        StudentBatchMap.teacher_id == teacher.id
    ).all()

    if not students:
        return AnnounceResponse(
            total_students=0, sent_count=0, failed_count=0, 
            failed_recipients=[], message="Batch is empty."
        )

    # 5. Send Emails
    sent_count = 0
    failed_recipients = []
    
    timestamp_str = datetime.now().strftime("%B %d, %Y at %I:%M %p")
    email_html = get_batch_announcement_template(
        teacher_name=teacher.full_name or "Your Teacher",
        batch_name=batch.name,
        message=request.message,
        timestamp=timestamp_str
    )
    email_subject = f"Announcement – {batch.name}"

    for s in students:
        if not s.email:
            failed_recipients.append(FailedRecipient(
                student_id=s.id, name=s.full_name, reason="No email address"
            ))
            continue

        try:
            success = send_email(to_email=s.email, subject=email_subject, html_content=email_html)
            if success:
                sent_count += 1
            else:
                failed_recipients.append(FailedRecipient(
                    student_id=s.id, name=s.full_name, reason="Email provider failed"
                ))
        except Exception as e:
            failed_recipients.append(FailedRecipient(
                student_id=s.id, name=s.full_name, reason=str(e)
            ))

    return AnnounceResponse(
        total_students=len(students),
        sent_count=sent_count,
        failed_count=len(failed_recipients),
        failed_recipients=failed_recipients,
        message="Announcement process completed."
    )
