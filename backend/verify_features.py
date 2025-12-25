import sys
import os
print("[DEBUG] Verification Script Starting...", flush=True) # Immediate Debug
from datetime import date, datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Setup path
sys.path.append(os.getcwd())

from database import Base, get_db, engine
from models import StudyGoal, CreateTaskAI, CreateTaskManual, User
from api.ai import generate_tasks, GeneratePlanRequest
# We need a mock user or a real user in DB
from auth import get_password_hash

# Setup
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

def log(msg, status="INFO"):
    print(f"[{status}] {msg}")

def verify():
    log("Starting Verification...")
    
    # 1. Setup Test User
    test_email = "verify_tester@example.com"
    user = db.query(User).filter(User.email == test_email).first()
    if not user:
        user = User(
            email=test_email, 
            full_name="Verify Tester", 
            hashed_password=get_password_hash("testpass"),
            student_profile={"grade": "10"}
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    log(f"User: {user.email} (ID: {user.id})")

    # 2. Setup Test Goal
    # Clean previous cleanup
    db.query(CreateTaskAI).filter(CreateTaskAI.student_id == user.id).delete()
    db.query(CreateTaskManual).filter(CreateTaskManual.student_id == user.id).delete()
    db.query(StudyGoal).filter(StudyGoal.student_id == user.id).delete()
    db.commit()

    goal = StudyGoal(
        student_id=user.id,
        title="Original Goal Name",
        type="exam",
        date=date.today() + timedelta(days=10),
        current_status="active"
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)
    log(f"Created Goal: {goal.title} (Date: {goal.date})")

    # 3. Add Manual Task (Should be immutable)
    manual_task = CreateTaskManual(
        student_id=user.id,
        title="Don't Delete Me",
        task_date=date.today() + timedelta(days=1),
        status="active"
    )
    db.add(manual_task)
    db.commit()
    log("Created Manual Task")

    # 4. Generate Initial AI Tasks (Mode: Create)
    log("Generating Initial AI Tasks...")
    req = GeneratePlanRequest(
        goal_id=goal.goal_id,
        topics="Math,Science",
        start_date=date.today(),
        end_date=goal.date,
        hours_per_day=2,
        mode="create"
    )
    # Using the function directly implies we mock 'current_user' dependency or pass it manually 
    # But function signature expects (request, db, current_user).
    # We can call it directly.
    try:
        generate_tasks(req, db, user)
        # Commit manually if function doesn't commit? 
        # generate_tasks commits internally (it uses db.add/commit usually via helpers or directly)
        # Let's check api/ai.py implementation -- it builds list but does it save? 
        # Wait, previous view of ai.py showed it calculating but I didn't see the SAVE part?
        # Let me re-check api/ai.py inside this script or assumption.
        # Actually I better check api/ai.py code again to be sure it saves.
        # Assuming it does for now, checking count.
        
        # NOTE: If generate_tasks implementation was unfinished in saving, this will fail, which is good verification.
    except Exception as e:
        log(f"Generation Failed: {e}", "ERROR")
        return

    ai_tasks_count = db.query(CreateTaskAI).filter(CreateTaskAI.goal_id == goal.goal_id).count()
    log(f"Initial AI Tasks: {ai_tasks_count}")
    if ai_tasks_count == 0:
        log("No tasks generated! Checking implementation...", "FAIL")
        # Proceeding to save them manually for test continuity if needed, or failing.
        # Actually, let's verify if generate_tasks inserts into DB.
        
    # 5. Verify: Change Name
    log("--- Test: Change Planner Name ---")
    log(f"Old Name: {goal.title}")
    goal.title = "Renamed Goal"
    db.commit()
    # Check tasks didn't change
    current_ai_count = db.query(CreateTaskAI).filter(CreateTaskAI.goal_id == goal.goal_id).count()
    if current_ai_count == ai_tasks_count:
        log("Goal Renamed. Task count unchanged.", "PASS")
    else:
        log(f"Tasks changed! {current_ai_count}", "FAIL")

    # 6. Verify: Change Date - Keep Existing
    log("--- Test: Change Date (Keep Existing) ---")
    old_date = goal.date
    new_date = old_date + timedelta(days=5)
    
    # Action: Update Goal Date ONLY
    goal.date = new_date
    db.commit()
    
    # Check: AI Tasks should NOT have changed count or dates (unless ID changed? no)
    # We assume 'keep_existing' means backend API `update_goal` was called, which we just simulated by `goal.date = ...`
    # Verify tasks match original
    latest_task = db.query(CreateTaskAI).filter(CreateTaskAI.goal_id == goal.goal_id).order_by(CreateTaskAI.task_date.desc()).first()
    if latest_task and latest_task.task_date <= old_date:
        log("Tasks remain within old date range.", "PASS")
    else:
        log("Tasks moved?!", "FAIL")

    # 7. Verify: Change Date - Full Regenerate
    log("--- Test: Change Date (Full Regenerate) ---")
    # Simulate API call with mode='full_regenerate'
    req_regen = GeneratePlanRequest(
        goal_id=goal.goal_id,
        topics="Math,Science",
        start_date=date.today(),
        end_date=new_date,
        hours_per_day=2,
        mode="full_regenerate"
    )
    generate_tasks(req_regen, db, user)
    
    # Verify: Old tasks gone?
    # New task count should be roughly (new_date - today) days
    new_count = db.query(CreateTaskAI).filter(CreateTaskAI.goal_id == goal.goal_id).count()
    log(f"Regenerated Task Count: {new_count}")
    
    # Check Manual Task still exists
    manual_still_exists = db.query(CreateTaskManual).filter(CreateTaskManual.title == "Don't Delete Me").first()
    if manual_still_exists:
        log("Manual Task Preserved.", "PASS")
    else:
        log("Manual Task DELETED!", "FAIL")

    # 8. Verify: Change Date - Extend Only
    log("--- Test: Change Date (Extend Only) ---")
    # Simulate extending further
    extended_date = new_date + timedelta(days=3)
    
    # We need to simulate the frontend logic: Start = Old Date (+1 maybe), End = New Date
    # Frontend sends: Start = Old Deadline (e.g. new_date).
    req_extend = GeneratePlanRequest(
        goal_id=goal.goal_id,
        topics="Math,Science",
        start_date=new_date, # Overlap 1 day or start next? Frontend sends "Old Deadline".
        end_date=extended_date,
        hours_per_day=2,
        mode="extend_only"
    )
    
    # Capture current tasks before extension
    pre_extend_ids = [t.task_id for t in db.query(CreateTaskAI).filter(CreateTaskAI.goal_id == goal.goal_id).all()]
    
    generate_tasks(req_extend, db, user)
    
    # Verify: Old tasks still exist
    post_extend_tasks = db.query(CreateTaskAI).filter(CreateTaskAI.goal_id == goal.goal_id).all()
    post_extend_ids = [t.task_id for t in post_extend_tasks]
    
    if set(pre_extend_ids).issubset(set(post_extend_ids)):
        log("Old tasks preserved during extension.", "PASS")
    else:
        log("Old tasks lost during extension!", "FAIL")
        
    if len(post_extend_ids) > len(pre_extend_ids):
        log(f"Tasks added: {len(post_extend_ids) - len(pre_extend_ids)}", "PASS")
    else:
        log("No new tasks added?", "FAIL")

    # Cleanup
    # db.delete(user) ... skip cleanup for debugging if needed
    log("Verification Complete.")

if __name__ == "__main__":
    try:
        verify()
    except Exception as e:
        log(f"Crash: {e}", "CRITICAL")
