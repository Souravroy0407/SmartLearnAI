from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import CreateTaskManual, User
from auth import get_current_user
from api.study_planner import CreateManualTaskRequest, ManualTaskResponse

router = APIRouter()

@router.post("/manual", response_model=ManualTaskResponse, status_code=status.HTTP_201_CREATED)
def create_manual_task(
    task: CreateManualTaskRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new manual task for the authenticated student.
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
        
    db_task = CreateTaskManual(
        student_id=current_user.id, # Assumes 1:1 user-student or direct use of user_id
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

from pydantic import BaseModel

class ManualTaskUpdate(BaseModel):
    status: str

@router.put("/manual/{task_id}")
def update_manual_task_status(
    task_id: int,
    update_data: ManualTaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update status of a manual task (e.g. 'completed', 'pending').
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    task = db.query(CreateTaskManual).filter(
        CreateTaskManual.task_id == task_id,
        CreateTaskManual.student_id == current_user.id
    ).first()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    task.status = update_data.status
    db.commit()
    db.refresh(task)

    return {"message": "Task updated successfully", "task_id": task_id, "status": task.status}
