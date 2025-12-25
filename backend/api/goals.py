from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import StudyGoal, User
from auth import get_current_user

router = APIRouter()

@router.delete("/{goal_id}")
def delete_goal(
    goal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Fetch the goal
    goal = db.query(StudyGoal).filter(StudyGoal.goal_id == goal_id).first()

    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    # Verify ownership
    if goal.student_id != current_user.id:
        # Note: In a real app we might check if user is admin, but for now strict ownership
        raise HTTPException(status_code=403, detail="Not authorized to delete this goal")

    # Delete the goal
    # database is configured with ON DELETE CASCADE for tasks, so we just delete the goal
    db.delete(goal)
    db.commit()

    return {"message": "Goal deleted successfully"}

@router.put("/{goal_id}/complete")
def complete_goal(
    goal_id: int,
    status: str = "completed", # Added status param (default to completed)
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Fetch Goal
    goal = db.query(StudyGoal).filter(StudyGoal.goal_id == goal_id).first()

    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    if goal.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    try:
        # 2. Update Goal Status
        goal.current_status = status # Correct field name from models.py
        # goal.completed_at = datetime.utcnow() # If field exists (schema dependent)

        # 3. Update AI Tasks
        # Import models here to avoid circular imports if any, or ensure top-level import
        from models import CreateTaskAI, CreateTaskManual
        
        # Update AI Tasks
        db.query(CreateTaskAI).filter(
            CreateTaskAI.goal_id == goal_id,
            CreateTaskAI.student_id == current_user.id
        ).update({CreateTaskAI.task_status: status}, synchronize_session=False)

        # 4. Manual Tasks - (Skip as discussed in previous analysis - no safe link)
        
        # 5. Commit
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

    return {"message": "Goal and related tasks marked as completed"}
