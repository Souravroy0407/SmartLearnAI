from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, date as PyDate, timedelta
import google.generativeai as genai
import os
import json
import re

from database import get_db
from models import StudyGoal, CreateTaskAI, User
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

class GeneratePlanRequest(BaseModel):
    subject: str
    topics: str
    exam_date: str
    start_date: str # YYYY-MM-DD
    hours_per_day: float
    energy_preference: Optional[str] = None
    goal_id: int # NEW: Required to link tasks

# --- Helper Functions ---

def get_valid_gemini_model(api_key: str):
    """
    Dynamically find a Gemini model that supports generateContent.
    """
    genai.configure(api_key=api_key)
    desired_model = os.getenv("GEMINI_MODEL")
    
    try:
        valid_models = []
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                valid_models.append(m.name)
        
        if desired_model:
            for vm in valid_models:
                if desired_model in vm:
                    return vm
        
        preferred = [m for m in valid_models if 'flash' in m.lower()]
        if preferred:
            return preferred[0]
            
        if valid_models:
            return valid_models[0]
            
    except Exception as e:
        print(f"Error listing models: {e}")
        
    return desired_model or "models/gemini-1.5-flash"

# --- Endpoints ---

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

@router.post("/generate")
def generate_study_plan(
    request: GeneratePlanRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Gemini API Key not configured")
    
    # Removed student_profile check
    
    # 0. Validate Goal
    goal = db.query(StudyGoal).filter(
        StudyGoal.goal_id == request.goal_id,
        StudyGoal.student_id == current_user.id
    ).first()
    
    if not goal:
        raise HTTPException(status_code=404, detail="Study Goal not found")

    # 1. Validate Dates
    try:
        start_dt = datetime.strptime(request.start_date, "%Y-%m-%d")
        exam_dt = datetime.strptime(request.exam_date, "%Y-%m-%d")
        if start_dt >= exam_dt:
             raise HTTPException(status_code=400, detail="Start Date must be before Exam Date")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid Date Format (YYYY-MM-DD)")

    # 2. Energy Preference
    user_energy_pref = request.energy_preference or "balanced"
    
    print(f"[DEBUG] Generating plan for Goal '{goal.title}'. Start: {request.start_date}, Exam: {request.exam_date}")
    
    # 3. AI Generation
    try:
        valid_model_name = get_valid_gemini_model(api_key)
        model = genai.GenerativeModel(valid_model_name)

        # Energy Preference Logic
        energy_instructions = ""
        if user_energy_pref == "morning":
            energy_instructions = "HARD CONSTRAINT: Schedule ALL tasks ONLY between 6 AM and 10 AM. Do NOT schedule outside this window."
        elif user_energy_pref == "afternoon":
            energy_instructions = "HARD CONSTRAINT: Schedule ALL tasks ONLY between 12 PM and 4 PM. Do NOT schedule outside this window."
        elif user_energy_pref == "night":
            energy_instructions = "HARD CONSTRAINT: Schedule ALL tasks ONLY between 7 PM and 11 PM. Do NOT schedule outside this window."
        else:
            energy_instructions = "Create a balanced schedule starting around 9 AM."
    
        # Use goal.title as primary subject context if distinct
        # The prompt uses request.subject, which the frontend sends.
        # We will keep using request.subject to not break the prompt logic, 
        # but the Tasks will be linked to the Goal.
        
        prompt = f"""
        You are an expert study planner. Create a study schedule for me.
        
        Start Date: {request.start_date}
        Subject: {request.subject}
        Topics to Cover: {request.topics}
        Exam Date: {request.exam_date}
        Available Hours Per Day: {request.hours_per_day}
        User Energy Preference: {user_energy_pref}
        
        Requirements:
        1. Break down the topics into daily study tasks starting from {request.start_date} up to (but NOT INCLUDING) {request.exam_date}.
        2. MANDATORY: The day immediately before the exam ({ (exam_dt - timedelta(days=1)).strftime('%Y-%m-%d') }) MUST be dedicated entirely to REVISION. Do NOT introduce new topics on this day.
        3. Vary the task types (Video Lecture, Revision, Practice Quiz, Assignment).
        4. Ensure total minutes per day does not exceed {request.hours_per_day * 60} minutes.
        5. {energy_instructions}
        6. ABSOLUTELY NO tasks should be scheduled for {request.exam_date} or later.
        7. Provide the response strictly in valid JSON format.
        8. No markdown code blocks, just raw JSON.
        
        JSON Schema:
        [
            {{
                "title": "Topic Name: Activity",
                "task_type": "Revision" | "Practice Quiz" | "Video Lecture" | "Assignment" | "New Concept" | "Problem Solving",
                "start_time_offset_days": 0, // MUST BE 0 for the first task.
                "start_hour": 9, // Desired start hour (0-23) based on energy preference
                "duration_minutes": 60,
                "color": "bg-primary" // bg-primary (standard), bg-warning (hard/focus), bg-success (easy/revision), bg-error (urgent)
            }}
        ]
        """
    
        response = model.generate_content(prompt)
        text = response.text
        
        text = re.sub(r"```json\s*", "", text)
        text = re.sub(r"```", "", text)
        
        tasks_data = json.loads(text)
        
        created_tasks = []
        base_date_ref = start_dt
        
        for item in tasks_data:
            target_date = base_date_ref + timedelta(days=item['start_time_offset_days'])
            
            if target_date.date() >= exam_dt.date():
                continue

            start_hour = item.get('start_hour', 9)
            
            # Simple clamp logic
            # (Keeping simplified for this migration)
            start_time = target_date.replace(hour=int(start_hour), minute=0, second=0, microsecond=0)
            
            # Create CreateTaskAI Record
            # Mapping:
            # - goal_id -> goal.goal_id
            # - student_id -> goal.student_id
            # - title -> item['title'] (AI generated title)
            # - task_time -> start_time
            # - task_status -> 'active'
            
            task = CreateTaskAI(
                goal_id=goal.goal_id,
                student_id=goal.student_id,
                title=item['title'], # AI generated title
                task_time=start_time,
                task_status='active'
            )
            
            db.add(task)
            created_tasks.append(task)
            
        db.commit()
        return {"message": f"Successfully generated {len(created_tasks)} study tasks."}
        
    except Exception as e:
        print(f"AI Generation Failed: {e}")
        db.rollback() 
        raise HTTPException(status_code=500, detail="Plan Generation Failed")

@router.patch("/tasks/ai/{task_id}/complete")
def complete_ai_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user.student_profile:
        raise HTTPException(status_code=400, detail="User must have a student profile")
        
    # Verify task ownership via student_id directly
    task = db.query(CreateTaskAI).filter(
        CreateTaskAI.task_id == task_id,
        CreateTaskAI.student_id == current_user.student_profile.id
    ).first()
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    task.task_status = 'completed'
    db.commit()
    db.refresh(task)
    
    return {"message": "Task marked as completed", "task_id": task_id, "status": task.task_status}

