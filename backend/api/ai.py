from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, date as PyDate, timedelta
import os

from database import get_db
from models import StudyGoal, CreateTaskAI, User
from auth import get_current_user

router = APIRouter()

# --- Pydantic Schemas ---

class StudyTaskResponse(BaseModel):
    task_id: int
    goal_id: int
    title: str
    task_date: Optional[PyDate]
    duration_minutes: Optional[int]
    sequence_no: Optional[int]
    task_status: str

    class Config:
        from_attributes = True

class GeneratePlanRequest(BaseModel):
    goal_id: int
    topics: str
    start_date: PyDate
    end_date: PyDate
    hours_per_day: int

# --- Endpoints ---

@router.post("/generate-tasks", response_model=List[StudyTaskResponse])
def generate_tasks(
    request: GeneratePlanRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 0. Validate Goal ownership
    goal = db.query(StudyGoal).filter(
        StudyGoal.goal_id == request.goal_id,
        StudyGoal.student_id == current_user.id
    ).first()
    
    if not goal:
        raise HTTPException(status_code=404, detail="Study Goal not found")

    # 1. Validate Dates
    start_dt = request.start_date
    exam_dt = request.end_date
    
    if start_dt >= exam_dt:
         raise HTTPException(status_code=400, detail="Start Date must be before End Date")

    print(f"[DEBUG] Generating plan for Goal '{goal.title}'. Start: {start_dt}, End: {exam_dt}")
    
    # 2. Deterministic Task Generation
    try:
        # Calculate Duration (Minutes)
        duration_minutes = request.hours_per_day * 60
        
        # Parse Topics
        topic_list = [t.strip() for t in request.topics.split(',') if t.strip()]
        if not topic_list:
            topic_list = ["General Study"] # Fallback if empty

        # Calculate Date Range
        total_days = (exam_dt - start_dt).days + 1
        
        created_tasks = []
        
        for i in range(total_days):
            current_date = start_dt + timedelta(days=i)
            
            # Topic Distribution Logic
            day_topics = []
            
            if len(topic_list) > total_days:
                # More topics than days: compress multiple topics into one day
                start_idx = int(i * len(topic_list) / total_days)
                end_idx = int((i + 1) * len(topic_list) / total_days)
                day_topics = topic_list[start_idx:end_idx]
                
                if not day_topics:
                    day_topics = [topic_list[i % len(topic_list)]]
            else:
                # More days than topics: spread, repeat/revise
                day_topics = [topic_list[i % len(topic_list)]]
            
            # Formulate Title
            topic_str = " & ".join(day_topics)
            task_title = f"Study {topic_str}"
            
            # Task Time (Default 9 AM)
            task_time = datetime.combine(current_date, datetime.min.time()).replace(hour=9)
            
            # Create Task Record
            task = CreateTaskAI(
                goal_id=goal.goal_id,
                student_id=goal.student_id,
                title=task_title,
                task_time=task_time,
                task_date=current_date,
                duration_minutes=duration_minutes,
                sequence_no=i + 1,
                task_status='active'
            )
            
            db.add(task)
            created_tasks.append(task)
            
        db.commit()
        # Refresh to get IDs if needed, but returning list of objects works with ORM mode
        return created_tasks
        
    except Exception as e:
        print(f"Task Generation Failed: {e}")
        db.rollback() 
        raise HTTPException(status_code=500, detail="Task Generation Failed")
