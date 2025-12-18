from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel
import google.generativeai as genai
import os
import json
import re

from database import get_db
from models import StudyTask, User, Exam
from auth import get_current_user

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
    energy_preference: Optional[str] = None

class RescheduleSuggestion(BaseModel):
    date: str  # YYYY-MM-DD
    start_time: str # HH:MM
    display_text: str # "Today 9:00–10:00 PM"
    iso_start_time: datetime

class ExamResponse(BaseModel):
    id: int
    title: str
    date: datetime
    
    class Config:
        from_attributes = True

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

@router.get("/exams", response_model=List[ExamResponse])
def get_upcoming_exams(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Fetch exams for user, sorted by date, only future ones (or including today)
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    return db.query(Exam).filter(
        Exam.user_id == current_user.id,
        Exam.date >= today
    ).order_by(Exam.date.asc()).all()

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

    db.delete(db_task)
    db.commit()
    return {"message": "Task deleted successfully"}

def get_valid_gemini_model(api_key: str):
    """
    Dynamically find a Gemini model that supports generateContent.
    """
    genai.configure(api_key=api_key)
    desired_model = os.getenv("GEMINI_MODEL")
    
    try:
        # 1. List valid models
        valid_models = []
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                valid_models.append(m.name)
        
        # 2. Check if desired model is valid
        if desired_model:
            # Handle short names vs full names (e.g. gemini-1.5-flash vs models/gemini-1.5-flash)
            for vm in valid_models:
                if desired_model in vm:
                    return vm
        
        # 3. Fallback to first valid model (prefering flash or pro)
        preferred = [m for m in valid_models if 'flash' in m.lower()]
        if preferred:
            return preferred[0]
            
        if valid_models:
            return valid_models[0]
            
    except Exception as e:
        print(f"Error listing models: {e}")
        
    # Final fallback if listing fails but we have a name
    return desired_model or "models/gemini-1.5-flash"

def generate_deterministic_plan(subject: str, topics: str, user_energy_pref: str, start_date_ref: datetime, db: Session, user: User):
    """
    Fallback planner when AI fails. Distributes topics sequentially into peak hours.
    """
    topic_list = [t.strip() for t in topics.replace('\n', ',').split(',') if t.strip()]
    if not topic_list:
        topic_list = [f"Study {subject} - Session {i+1}" for i in range(5)]
        
    created_tasks = []
    
    # Scheduling constraints (Same as AI logic)
    morning_window = (6, 10)
    afternoon_window = (12, 16)
    night_window = (19, 23)
    allowed_start, allowed_end = 9, 17 # Balanced
    
    if user_energy_pref == "morning": allowed_start, allowed_end = morning_window
    elif user_energy_pref == "afternoon": allowed_start, allowed_end = afternoon_window
    elif user_energy_pref == "night": allowed_start, allowed_end = night_window

    current_date = start_date_ref
    current_hour = allowed_start
    
    for i, topic in enumerate(topic_list):
        # Determine Task Type (Simple heuristic)
        task_type = "Revision" if i % 3 == 0 else "New Concept"
        duration = 60
        
        # Create Task
        start_time = current_date.replace(hour=current_hour, minute=0, second=0, microsecond=0)
        
        # Color mapping logic
        color = 'bg-primary'
        if user_energy_pref in ['morning', 'afternoon', 'night']:
             # Assume in-peak is focused
             color = 'bg-warning' 
        
        task = StudyTask(
             user_id=user.id,
             title=f"{topic}",
             task_type=task_type,
             start_time=start_time,
             duration_minutes=duration,
             status="pending",
             color=color
        )
        db.add(task)
        created_tasks.append(task)
        
        # Advance time
        current_hour += 1
        # Check overflow
        if current_hour >= allowed_end:
            current_hour = allowed_start
            current_date += timedelta(days=1)
            
    db.commit()
    return {"message": f"Generated {len(created_tasks)} tasks (Offline Mode)."}

@router.post("/generate")
def generate_study_plan(
    request: GeneratePlanRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Gemini API Key not configured")
    
    # 1. Update Energy Preference if provided
    if request.energy_preference:
        current_user.energy_preference = request.energy_preference
        db.commit()
        db.refresh(current_user)
    
    # Use stored preference if not provided in request (though frontend should send it)
    user_energy_pref = current_user.energy_preference or "balanced"

    # 2. CLEAR EXISTING TASKS (Persistence Rule: New Plan = Fresh Start)
    # Delete all tasks for this user
    db.query(StudyTask).filter(StudyTask.user_id == current_user.id).delete()
    
    # Also clear existing future exams to keep sync (optional but cleaner for this flow)
    # db.query(Exam).filter(Exam.user_id == current_user.id).delete()
    # Actually, let's keep it simple: Add new exam, maybe user has multiple subjects.
    # But prompt says "Completely remove any previous". 
    # Let's check if an exam for this subject exists and update it, or just add new.
    # Simpler: Create new exam entry.
    
    # Check if exam exists for this exact subject/date to avoid dupes from multiple generations
    existing_exam = db.query(Exam).filter(
        Exam.user_id == current_user.id, 
        Exam.title.ilike(f"%{request.subject}%")
    ).first()
    
    if existing_exam:
        existing_exam.date = datetime.strptime(request.exam_date, "%Y-%m-%d")
    else:
        new_exam = Exam(
            user_id=current_user.id,
            title=f"{request.subject} Exam",
            date=datetime.strptime(request.exam_date, "%Y-%m-%d")
        )
        db.add(new_exam)
    
    db.commit()
    
    
    # 3. AI Generation
    try:
        valid_model_name = get_valid_gemini_model(api_key)
        # print(f"Selected Model: {valid_model_name}") 
        model = genai.GenerativeModel(valid_model_name)

        today = datetime.now().strftime("%Y-%m-%d")
        
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
    
        prompt = f"""
        You are an expert study planner. Create a study schedule for me.
        
        Current Date: {today}
        Subject: {request.subject}
        Topics to Cover: {request.topics}
        Exam Date: {request.exam_date}
        Available Hours Per Day: {request.hours_per_day}
        User Energy Preference: {user_energy_pref}
        
        Requirements:
        1. Break down the topics into daily study tasks up to the exam date.
        2. Vary the task types (Video Lecture, Revision, Practice Quiz, Assignment).
        3. Ensure total minutes per day does not exceed {request.hours_per_day * 60} minutes.
        4. {energy_instructions}
        5. Provide the response strictly in valid JSON format.
        6. No markdown code blocks, just raw JSON.
        
        JSON Schema:
        [
            {{
                "title": "Topic Name: Activity",
                "task_type": "Revision" | "Practice Quiz" | "Video Lecture" | "Assignment" | "New Concept" | "Problem Solving",
                "start_time_offset_days": 0, // 0 for today, 1 for tomorrow, etc.
                "start_hour": 9, // Desired start hour (0-23) based on energy preference
                "duration_minutes": 60,
                "color": "bg-primary" // bg-primary (standard), bg-warning (hard/focus), bg-success (easy/revision), bg-error (urgent)
            }}
        ]
        """
    
        response = model.generate_content(prompt)
        text = response.text
        
        # Clean potential markdown formatting
        text = re.sub(r"```json\s*", "", text)
        text = re.sub(r"```", "", text)
        
        tasks_data = json.loads(text)
        
        created_tasks = []
        base_date_ref = datetime.now()
        
        for item in tasks_data:
            # Calculate start time based on offset and specified start_hour
            target_date = base_date_ref + timedelta(days=item['start_time_offset_days'])
            
            # Enforce peak hour start if AI goes off-track
            start_hour = item.get('start_hour', 9)
            
            # --- STRICT PEAK HOUR ENFORCEMENT ---
            # Define exact windows
            morning_window = (6, 10)    # 6 AM to 10 AM (End by 10)
            afternoon_window = (12, 16) # 12 PM to 4 PM (End by 4)
            night_window = (19, 23)     # 7 PM to 11 PM (End by 11)
            
            allowed_start, allowed_end = 9, 17 # Default balanced
            
            if user_energy_pref == "morning":
                allowed_start, allowed_end = morning_window
            elif user_energy_pref == "afternoon":
                allowed_start, allowed_end = afternoon_window
            elif user_energy_pref == "night":
                allowed_start, allowed_end = night_window
                
            # Clamp start hour to window if outside
            if user_energy_pref in ["morning", "afternoon", "night"]:
                if start_hour < allowed_start or start_hour >= allowed_end:
                    start_hour = allowed_start

            start_time = target_date.replace(hour=int(start_hour), minute=0, second=0, microsecond=0)
            
            # Conflict resolution: if multiple tasks scheduled for same time, offset them
            days_tasks = [t for t in created_tasks if t.start_time.date() == start_time.date()]
            
            if days_tasks:
                 # Find the latest end time for today
                 latest_end_time = max([t.start_time + timedelta(minutes=t.duration_minutes) for t in days_tasks])
                 if start_time < latest_end_time:
                     start_time = latest_end_time + timedelta(minutes=15) # 15 min break
            
            # --- OVERFLOW CHECK ---
            # If the adjusted start_time pushes the task OUT of the peak window, bump to next day
            if user_energy_pref in ["morning", "afternoon", "night"]:
                # task_end_hour = start_time.hour + (start_time.minute + item['duration_minutes']) / 60
                
                # If strictly outside window (e.g. starts at 10:15 AM for morning pref), move to next day
                if start_time.hour >= allowed_end:
                     # Move to next day at allowed_start
                     start_time = start_time + timedelta(days=1)
                     start_time = start_time.replace(hour=allowed_start, minute=0, second=0, microsecond=0)


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
        print(f"AI Generation Failed: {e}")
        # Fallback to deterministic planner
        print("Falling back to deterministic planner...")
        return generate_deterministic_plan(request.subject, request.topics, user_energy_pref, datetime.now(), db, current_user)

@router.post("/reoptimize")
def reoptimize_study_plan(
    energy_preference: str = "", # Using Query param for simplicity
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not energy_preference:
         raise HTTPException(status_code=400, detail="Energy preference is required")

    # 1. Update Preference
    current_user.energy_preference = energy_preference
    db.commit()
    
    # 2. Get Pending Tasks
    tasks = db.query(StudyTask).filter(
        StudyTask.user_id == current_user.id,
        StudyTask.status == "pending"
    ).all()
    
    if not tasks:
        return {"message": "Preference updated. No pending tasks to re-optimize."}

    # 3. Define Time Windows
    peak_start_hour = 9
    if energy_preference == "morning":
        peak_start_hour = 6
    elif energy_preference == "afternoon":
        peak_start_hour = 12
    elif energy_preference == "night":
        peak_start_hour = 19
        
    # 4. Re-schedule ALL tasks sequentially within the peak window
    tasks_by_date = {}
    for task in tasks:
        date_key = task.start_time.date()
        if date_key not in tasks_by_date:
            tasks_by_date[date_key] = []
        tasks_by_date[date_key].append(task)
        
    for date_key, day_tasks in tasks_by_date.items():
        # Sort tasks by original start time to maintain intent
        day_tasks.sort(key=lambda x: x.start_time)
        
        current_time = datetime.combine(date_key, datetime.min.time()).replace(hour=peak_start_hour)
        for t in day_tasks:
            t.start_time = current_time
            # Highlight hard tasks if they fit in peak (first 4 hours)
            is_peak = current_time.hour >= peak_start_hour and current_time.hour < (peak_start_hour + 4)
            if is_peak:
                t.color = "bg-warning" # Peak focus
            else:
                t.color = "bg-primary" # Overflow
                
            current_time += timedelta(minutes=t.duration_minutes + 15)
            
    db.commit()
    return {"message": f"Re-optimized {len(tasks)} tasks for {energy_preference} energy."}

@router.post("/tasks/{task_id}/reschedule-suggestions", response_model=List[RescheduleSuggestion])
def get_reschedule_suggestions(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    task = db.query(StudyTask).filter(StudyTask.id == task_id, StudyTask.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Local Logic
    suggestions = get_local_suggestions(task, db, current_user)
    
    # AI Fallback if less than 2 suggestions
    if len(suggestions) < 2:
        ai_suggestions = get_gemini_suggestions(task, db, current_user)
        # Merge and avoid duplicates (simple check by iso_start_time)
        existing_times = {s.iso_start_time for s in suggestions}
        for s in ai_suggestions:
            if s.iso_start_time not in existing_times and len(suggestions) < 3:
                suggestions.append(s)
    
    return suggestions

def get_local_suggestions(task: StudyTask, db: Session, user: User) -> List[RescheduleSuggestion]:
    # 1. Determine Difficulty
    hard_keywords = ["problem solving", "new concept", "video lecture", "exam", "quiz", "test"]
    is_hard = any(k in task.task_type.lower() or k in task.title.lower() for k in hard_keywords)
    
    # 2. Peak Hours Logic
    pref = (user.energy_preference or "balanced").lower()
    
    # Define hour blocks (4-hour windows)
    morning_slots = [6, 7, 8, 9]
    afternoon_slots = [12, 13, 14, 15]
    evening_slots = [19, 20, 21, 22]
    
    if pref == "morning":
        peak, mid, low = morning_slots, [10, 11], [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22]
    elif pref == "afternoon":
        peak, mid, low = afternoon_slots, [16, 17], [18, 19, 20, 21, 22, 6, 7, 8, 9, 10, 11]
    elif pref == "night":
        peak, mid, low = evening_slots, [23], [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]
    else: # balanced / default
        peak, mid, low = morning_slots + [14, 15], evening_slots, [12, 13, 16, 17, 18]

    # Order search hours based on difficulty
    if is_hard:
        # Hard tasks: Peak hours first, then mid-energy, then low-energy
        base_search_hours = peak + mid + low
    else:
        # Easy tasks: Mid-energy/Off-peak first, avoid peak if possible
        base_search_hours = mid + low + peak

    # Fetch all tasks for the next 4 days to check conflicts in memory
    now = datetime.now()
    end_of_range = now + timedelta(days=4)
    existing_tasks = db.query(StudyTask).filter(
        StudyTask.user_id == user.id,
        StudyTask.start_time >= now.replace(hour=0, minute=0, second=0, microsecond=0),
        StudyTask.start_time <= end_of_range,
        StudyTask.id != task.id
    ).all()

    suggestions = []
    
    # Scan next 4 days
    for day_offset in range(4): # 0 (today) to 3
        check_date = (now + timedelta(days=day_offset)).date()
        
        # Filter and deduplicate hours for this day
        search_hours = []
        for h in base_search_hours:
            if h not in search_hours and 6 <= h <= 23:
                # If today, only allow future hours
                if day_offset == 0 and h <= now.hour:
                    continue
                search_hours.append(h)
            
        for hour in search_hours:
            start_time = datetime.combine(check_date, datetime.min.time()).replace(hour=hour)
            end_time = start_time + timedelta(minutes=task.duration_minutes)
            
            # Check for conflicts in memory
            has_conflict = False
            for et in existing_tasks:
                et_end = et.start_time + timedelta(minutes=et.duration_minutes)
                if start_time < et_end and end_time > et.start_time:
                    has_conflict = True
                    break
            
            if not has_conflict:
                date_str = "Today" if day_offset == 0 else "Tomorrow" if day_offset == 1 else check_date.strftime("%a, %b %d")
                time_range = f"{start_time.strftime('%I:%M %p')}–{end_time.strftime('%I:%M %p')}"
                
                suggestions.append(RescheduleSuggestion(
                    date=check_date.strftime("%Y-%m-%d"),
                    start_time=start_time.strftime("%H:%M"),
                    display_text=f"{date_str} {time_range}",
                    iso_start_time=start_time
                ))
                
            if len(suggestions) >= 3:
                break
        if len(suggestions) >= 3:
            break
            
    return suggestions

def get_gemini_suggestions(task: StudyTask, db: Session, user: User) -> List[RescheduleSuggestion]:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return [] # Silent fail or log
        
    genai.configure(api_key=api_key)
    try:
        model = genai.GenerativeModel(get_valid_gemini_model(api_key))
    except:
        model = genai.GenerativeModel("gemini-1.5-flash")
    
    # Get other tasks for context to avoid conflicts
    other_tasks = db.query(StudyTask).filter(
        StudyTask.user_id == user.id,
        StudyTask.start_time >= datetime.now(),
        StudyTask.id != task.id
    ).order_by(StudyTask.start_time).limit(20).all()
    
    tasks_context = [{"title": t.title, "start": t.start_time.isoformat(), "duration": t.duration_minutes} for t in other_tasks]
    
    prompt = f"""
    You are a study assistant. Suggest 3 alternative time slots for this study task:
    Task: "{task.title}" ({task.task_type}, {task.duration_minutes} mins)
    User Preference: {user.energy_preference or 'balanced'}
    Current Time: {datetime.now().isoformat()}
    
    Existing Schedule: {json.dumps(tasks_context)}
    
    Requirements:
    1. Do NOT overlap with existing tasks.
    2. Respect energy preference (hard tasks in peak hours).
    3. Return ONLY valid JSON as a list of objects.
    
    JSON Schema:
    [
        {{
            "date": "YYYY-MM-DD",
            "start_time": "HH:MM",
            "display_text": "Today/Tomorrow/Date 9:00–10:00 PM"
        }}
    ]
    """
    
    try:
        response = model.generate_content(prompt)
        text = re.sub(r"```json\s*|```", "", response.text)
        data = json.loads(text)
        
        results = []
        for item in data:
            dt = datetime.strptime(f"{item['date']} {item['start_time']}", "%Y-%m-%d %H:%M")
            results.append(RescheduleSuggestion(
                date=item['date'],
                start_time=item['start_time'],
                display_text=item['display_text'],
                iso_start_time=dt
            ))
        return results
    except Exception as e:
        print(f"Gemini Reschedule Error: {e}")
        return []
