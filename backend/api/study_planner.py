from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel
import google.generativeai as genai
import os
import json
import re

from backend.database import get_db
from backend.models import StudyTask, User
from backend.auth import get_current_user

router = APIRouter()

# --- Pydantic Schemas ---
class TaskBase(BaseModel):
    title: str
    task_type: str
    start_time: datetime
    duration_minutes: int
    color: str

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    task_type: Optional[str] = None
    start_time: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    status: Optional[str] = None
    color: Optional[str] = None

class TaskResponse(TaskBase):
    id: int
    user_id: int
    status: str

    class Config:
        from_attributes = True

class GeneratePlanRequest(BaseModel):
    subject: str
    topics: str
    exam_date: str
    hours_per_day: float

# --- Endpoints ---

@router.get("/tasks", response_model=List[TaskResponse])
def get_tasks(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(StudyTask).filter(StudyTask.user_id == current_user.id)
    
    if start_date:
        query = query.filter(StudyTask.start_time >= start_date)
    if end_date:
        query = query.filter(StudyTask.start_time <= end_date)
        
    return query.all()

@router.post("/tasks", response_model=TaskResponse)
def create_task(
    task: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_task = StudyTask(
        **task.dict(),
        user_id=current_user.id,
        status="pending"
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

@router.put("/tasks/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: int,
    task_update: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_task = db.query(StudyTask).filter(StudyTask.id == task_id, StudyTask.user_id == current_user.id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    update_data = task_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_task, key, value)
        
    db.commit()
    db.refresh(db_task)
    return db_task

@router.delete("/tasks/{task_id}")
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_task = db.query(StudyTask).filter(StudyTask.id == task_id, StudyTask.user_id == current_user.id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    db.delete(db_task)
    db.commit()
    return {"message": "Task deleted successfully"}

@router.post("/generate")
def generate_study_plan(
    request: GeneratePlanRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Gemini API Key not configured")
    
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-flash-latest')

    today = datetime.now().strftime("%Y-%m-%d")
    
    prompt = f"""
    You are an expert study planner. Create a study schedule for me.
    
    Current Date: {today}
    Subject: {request.subject}
    Topics to Cover: {request.topics}
    Exam Date: {request.exam_date}
    Available Hours Per Day: {request.hours_per_day}
    
    Requirements:
    1. Break down the topics into daily study tasks up to the exam date.
    2. Vary the task types (Video Lecture, Revision, Practice Quiz, Assignment).
    3. Ensure total minutes per day does not exceed {request.hours_per_day * 60} minutes.
    4. Provide the response strictly in valid JSON format.
    5. No markdown code blocks, just raw JSON.
    
    JSON Schema:
    [
        {{
            "title": "Topic Name: Activity",
            "task_type": "Revision" | "Practice Quiz" | "Video Lecture" | "Assignment",
            "start_time_offset_days": 0, // 0 for today, 1 for tomorrow, etc.
            "duration_minutes": 60,
            "color": "bg-primary" // Use bg-primary for blue, bg-warning for yellow, bg-error for red, bg-success for green
        }}
    ]
    """
    
    try:
        response = model.generate_content(prompt)
        text = response.text
        
        # Clean potential markdown formatting
        text = re.sub(r"```json\s*", "", text)
        text = re.sub(r"```", "", text)
        
        tasks_data = json.loads(text)
        
        created_tasks = []
        base_time = datetime.now().replace(hour=9, minute=0, second=0, microsecond=0)
        
        for item in tasks_data:
            start_time = base_time + timedelta(days=item['start_time_offset_days'])
            
            # Simple conflict avoidance: Add hour offset for each subsequent task on the same day
            # (A real implementation would be more complex)
            days_tasks = [t for t in created_tasks if t.start_time.date() == start_time.date()]
            start_time = start_time + timedelta(hours=len(days_tasks))

            task = StudyTask(
                user_id=current_user.id,
                title=item['title'],
                task_type=item['task_type'],
                start_time=start_time,
                duration_minutes=item['duration_minutes'],
                status="pending",
                color=item.get('color', 'bg-primary')
            )
            db.add(task)
            created_tasks.append(task)
            
        db.commit()
        return {"message": f"Successfully generated {len(created_tasks)} study tasks."}
        
    except Exception as e:
        print(f"AI Generation Error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate plan: {str(e)}")
