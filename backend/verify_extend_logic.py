import sys
import os
from datetime import date, timedelta
from sqlalchemy.orm import Session
from database import SessionLocal, engine
from models import Base, User, StudyGoal, CreateTaskAI

# Setup
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def setup_test_data(db: Session):
    # 1. Create User
    user = db.query(User).filter(User.email == "verify_test@example.com").first()
    if not user:
        user = User(username="VerifyTest", email="verify_test@example.com", hashed_password="hashed")
        db.add(user)
        db.commit()
        db.refresh(user)
    
    # 2. Create Goal
    goal = db.query(StudyGoal).filter(StudyGoal.title == "Extend Logic Verification").first()
    if goal:
        # Cleanup tasks
        db.query(CreateTaskAI).filter(CreateTaskAI.goal_id == goal.goal_id).delete()
        db.delete(goal)
        db.commit()
        
    goal = StudyGoal(
        student_id=user.id,
        title="Extend Logic Verification",
        type="exam",
        date=date.today() + timedelta(days=10),
        current_status="active"
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)
    
    # 3. Create Existing Tasks (Day 1 and 2)
    # Day 1
    t1 = CreateTaskAI(
        goal_id=goal.goal_id,
        student_id=user.id,
        title="Existing Task 1",
        task_time=date.today(),
        task_date=date.today(),
        duration_minutes=60,
        sequence_no=1,
        task_status='active'
    )
    # Day 2
    t2 = CreateTaskAI(
        goal_id=goal.goal_id,
        student_id=user.id,
        title="Existing Task 2",
        task_time=date.today() + timedelta(days=1),
        task_date=date.today() + timedelta(days=1),
        duration_minutes=60,
        sequence_no=2,
        task_status='active'
    )
    db.add(t1)
    db.add(t2)
    db.commit()
    
    return user, goal

def verify_skip_logic():
    db = next(get_db())
    user, goal = setup_test_data(db)
    
    print(f"[INFO] Created Goal ID: {goal.goal_id} with 2 existing tasks.")
    
    # Simulate API Call: Generate Tasks from Day 2 to Day 4 (Overlap on Day 2)
    # Mode: "extend_only"
    
    from api.ai import generate_tasks, GeneratePlanRequest
    
    req = GeneratePlanRequest(
        goal_id=goal.goal_id,
        topics="Physics",
        start_date=date.today() + timedelta(days=1), # Day 2 (Duplicate)
        end_date=date.today() + timedelta(days=3),   # Day 4
        hours_per_day=2,
        mode="extend_only"
    )
    
    # Mock current_user dependency
    print("[INFO] Calling generate_tasks with overlap...")
    new_tasks = generate_tasks(req, db, user)
    
    print(f"[INFO] Generated {len(new_tasks)} new tasks.")
    
    # Verification 1: Day 2 should be skipped
    day2_exists_count = db.query(CreateTaskAI).filter(
        CreateTaskAI.goal_id == goal.goal_id,
        CreateTaskAI.task_date == date.today() + timedelta(days=1)
    ).count()
    
    if day2_exists_count == 1:
        print("✅ PASS: Day 2 duplicate prevented (Count is still 1).")
    else:
        print(f"❌ FAIL: Day 2 count is {day2_exists_count}.")
        
    # Verification 2: Day 3 and 4 should be created
    day3 = db.query(CreateTaskAI).filter(CreateTaskAI.goal_id == goal.goal_id, CreateTaskAI.task_date == date.today() + timedelta(days=2)).first()
    day4 = db.query(CreateTaskAI).filter(CreateTaskAI.goal_id == goal.goal_id, CreateTaskAI.task_date == date.today() + timedelta(days=3)).first()
    
    if day3 and day4:
        print("✅ PASS: Day 3 and 4 created.")
    else:
        print("❌ FAIL: Day 3 or 4 missing.")

    # Verification 3: Sequence Numbers
    # Existing were 1 and 2.
    # Day 3 should be 3. Day 4 should be 4.
    if day3.sequence_no == 3 and day4.sequence_no == 4:
         print(f"✅ PASS: Sequence numbers are correct ({day3.sequence_no}, {day4.sequence_no}).")
    else:
         print(f"❌ FAIL: Sequence numbers incorrect. Day 3: {day3.sequence_no}, Day 4: {day4.sequence_no}.")

if __name__ == "__main__":
    try:
        verify_skip_logic()
    except Exception as e:
        print(f"❌ SCRIPTERROR: {e}")
        import traceback
        traceback.print_exc()
