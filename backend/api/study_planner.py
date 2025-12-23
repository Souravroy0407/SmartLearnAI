from fastapi import APIRouter, Depends, HTTPException
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
            task_status=t.task_status
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
            task_status=t.status
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

