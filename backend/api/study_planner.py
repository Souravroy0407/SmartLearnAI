from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional, Union
from pydantic import BaseModel
from datetime import datetime, date as PyDate, timedelta
import os

from database import get_db
from models import StudyGoal, CreateTaskAI, CreateTaskManual, User
from auth import get_current_user

router = APIRouter()

# --- Pydantic Schemas ---

class StudyGoalCreate(BaseModel):
    title: str
    type: str # 'daily', 'long-term' etc.
    date: Optional[PyDate] = None

class StudyGoalResponse(BaseModel):
    goal_id: int
    student_id: int
    title: str
    type: str
    date: Optional[PyDate]
    current_status: str
    created_at: datetime

    class Config:
        from_attributes = True

class CreateManualTaskRequest(BaseModel):
    title: str
    task_date: PyDate
    colourtag: Optional[str] = None
    task_time: Optional[datetime] = None
    # duration is not stored in DB as per manual task table
    # status default is handled by DB/Logic

class ManualTaskResponse(BaseModel):
    task_id: int
    student_id: int
    title: str
    task_date: PyDate
    colourtag: Optional[str]
    task_time: Optional[datetime]
    status: str
    created_at: datetime

    class Config:
        from_attributes = True




@router.post("/manual", response_model=ManualTaskResponse, status_code=status.HTTP_201_CREATED)
def create_manual_task(
    task: CreateManualTaskRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new manual task for the authenticated student.
    """
    db_task = CreateTaskManual(
        student_id=current_user.id,
        title=task.title,
        task_date=task.task_date,
        colourtag=task.colourtag,
        task_time=task.task_time,
        status="active" # Default status
    )
    
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    
    return db_task

@router.delete("/tasks/manual/{task_id}")
def delete_manual_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a manual task.
    """
    try:
        deleted = db.query(CreateTaskManual).filter(
            CreateTaskManual.task_id == task_id,
            CreateTaskManual.student_id == current_user.id
        ).delete(synchronize_session=False)
        
        if deleted == 0:
            raise HTTPException(status_code=404, detail="Task not found")
            
        db.commit()
        
        return {"message": "Manual task deleted successfully"}
    except HTTPException as he:
        raise he
    except Exception as e:
        db.rollback()
        print(f"Delete Manual task error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete task")

@router.delete("/tasks/ai/{task_id}")
def delete_ai_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete an AI-generated task.
    """
    try:
        deleted = db.query(CreateTaskAI).filter(
            CreateTaskAI.task_id == task_id,
            CreateTaskAI.student_id == current_user.id
        ).delete(synchronize_session=False)
        
        if deleted == 0:
            raise HTTPException(status_code=404, detail="Task not found")
            
        db.commit()
        
        return {"message": "AI task deleted successfully"}
    except HTTPException as he:
        raise he
    except Exception as e:
        db.rollback()
        print(f"Delete AI task error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete task")

@router.post("/goals", response_model=StudyGoalResponse)
def create_goal(
    goal: StudyGoalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Removed student_profile check as per requirement
        
    db_goal = StudyGoal(
        student_id=current_user.id, # Using user_id directly
        title=goal.title,
        type=goal.type,
        date=goal.date,
        current_status='active'
    )
    db.add(db_goal)
    db.commit()
    db.refresh(db_goal)
    return db_goal

@router.get("/goals", response_model=List[StudyGoalResponse])
def list_goals(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Removed student_profile check
        
    goals = db.query(StudyGoal).filter(
        StudyGoal.student_id == current_user.id
    ).all()
    
    return goals

@router.delete("/goals/{goal_id}")
def delete_goal(
    goal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Removed student_profile check
        
    goal = db.query(StudyGoal).filter(
        StudyGoal.goal_id == goal_id,
        StudyGoal.student_id == current_user.id
    ).first()
    
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
        
    db.delete(goal)
    db.commit()
    
    return {"message": "Goal deleted successfully"}



class StudyTaskResponse(BaseModel):
    task_id: int
    goal_id: int
    title: str
    task_date: Optional[PyDate]
    task_time: Optional[datetime] # Added for frontend compatibility
    duration_minutes: Optional[int]
    sequence_no: Optional[int]
    task_status: str
    is_manual: bool = False # Added to distinguish for UI actions
    task_type: str = "ai" # Source type: 'ai' or 'manual'

    class Config:
        from_attributes = True


@router.get("/tasks", response_model=List[StudyTaskResponse])
def list_tasks(
    date: Optional[PyDate] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Fetch AI Tasks
    ai_query = db.query(CreateTaskAI).filter(CreateTaskAI.student_id == current_user.id)
    if date:
        ai_query = ai_query.filter(CreateTaskAI.task_date == date)
    ai_tasks = ai_query.all()
    
    # Fetch Manual Tasks (if table exists and is used)
    # The user mentioned merging if planner supports it. Assuming yes.
    manual_query = db.query(CreateTaskManual).filter(CreateTaskManual.student_id == current_user.id)
    if date:
        manual_query = manual_query.filter(CreateTaskManual.task_date == date)
    manual_tasks = manual_query.all()
    
    # Convert and Combine
    combined_tasks = []
    
    for t in ai_tasks:
        combined_tasks.append(StudyTaskResponse(
            task_id=t.task_id,
            goal_id=t.goal_id,
            title=t.title,
            task_date=t.task_date,
            task_time=t.task_time,
            duration_minutes=t.duration_minutes,
            sequence_no=t.sequence_no or 0,
            task_status=t.task_status,
            is_manual=False,
            task_type="ai"
        ))
        
    # Manual tasks might not have goal_id, sequence_no etc. 
    # For now, mapping manually to match schema.
    # Note: StudyTaskResponse requires goal_id. CreateTaskManual doesn't have it.
    # We might need to adjust schema or use a dummy goal_id (e.g. 0).
    for t in manual_tasks:
         # Simplified mapping
         combined_tasks.append(StudyTaskResponse(
            task_id=t.task_id,
            goal_id=0, # Manual tasks don't belong to a goal
            title=t.title,
            task_date=t.task_date,
            task_time=t.task_time, # Manual tasks have task_time too
            duration_minutes=60, # Default if missing
            sequence_no=0,
            task_status=t.status,
            is_manual=True,
            task_type="manual"
        ))
    
    # Sort: Date ASC, Sequence ASC
    combined_tasks.sort(key=lambda x: (x.task_date or PyDate.min, x.sequence_no or 0))
    
    return combined_tasks


@router.patch("/tasks/ai/{task_id}/complete")
def complete_ai_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify task ownership via student_id directly
    task = db.query(CreateTaskAI).filter(
        CreateTaskAI.task_id == task_id,
        CreateTaskAI.student_id == current_user.id
    ).first()
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    task.task_status = 'completed'
    db.commit()
    db.refresh(task)
    
    return {"message": "Task marked as completed", "task_id": task_id, "status": task.task_status}



class TaskUpdate(BaseModel):
    status: Optional[str] = None
    task_date: Optional[PyDate] = None
    task_time: Optional[datetime] = None
    duration_minutes: Optional[int] = None

@router.put("/tasks/ai/{task_id}")
def update_ai_task(
    task_id: int,
    update_data: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    task = db.query(CreateTaskAI).filter(
        CreateTaskAI.task_id == task_id,
        CreateTaskAI.student_id == current_user.id
    ).first()

    if not task:
        raise HTTPException(status_code=404, detail="AI Task not found")

    if update_data.status:
        task.task_status = update_data.status
    if update_data.task_date:
        task.task_date = update_data.task_date
    if update_data.task_time:
        task.task_time = update_data.task_time
    if update_data.duration_minutes is not None:
        task.duration_minutes = update_data.duration_minutes
        
    db.commit()
    db.refresh(task)
    return {"message": "AI Task updated", "task_id": task_id, "status": task.task_status}


@router.put("/tasks/manual/{task_id}")
def update_manual_task(
    task_id: int,
    update_data: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    manual_task = db.query(CreateTaskManual).filter(
        CreateTaskManual.task_id == task_id,
        CreateTaskManual.student_id == current_user.id
    ).first()

    if not manual_task:
        raise HTTPException(status_code=404, detail="Manual Task not found")

    if update_data.status:
        manual_task.status = update_data.status
    if update_data.task_date:
        manual_task.task_date = update_data.task_date
    if update_data.task_time:
        manual_task.task_time = update_data.task_time
    if update_data.duration_minutes is not None:
         # Safely check or assume existence. Given models usually align.
         if hasattr(manual_task, 'duration_minutes'):
            manual_task.duration_minutes = update_data.duration_minutes
        
    db.commit()
    db.refresh(manual_task)
    return {"message": "Manual Task updated", "task_id": task_id, "status": manual_task.status}


# Helper for backward compatibility or generic ID usage (Optional but good for safety)
# The user asked to route specifically, so generic route might be removed or kept as fallback.
# Keeping generic /tasks/{task_id} as fallback/legacy router if needed, 
# but modifying it to try to find either if called directly.
@router.put("/tasks/{task_id}")
def update_task_any(
    task_id: int,
    update_data: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Try AI first
    ai_task = db.query(CreateTaskAI).filter(CreateTaskAI.task_id == task_id, CreateTaskAI.student_id == current_user.id).first()
    if ai_task:
        return update_ai_task(task_id, update_data, db, current_user)
    
    # Try Manual
    manual_task = db.query(CreateTaskManual).filter(CreateTaskManual.task_id == task_id, CreateTaskManual.student_id == current_user.id).first()
    if manual_task:
        return update_manual_task(task_id, update_data, db, current_user)
        
    raise HTTPException(status_code=404, detail="Task not found")

