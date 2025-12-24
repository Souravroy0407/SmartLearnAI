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
