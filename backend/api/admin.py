from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import User, Student, Teacher, Admin
from auth import oauth2_scheme, SECRET_KEY, ALGORITHM
from jose import jwt, JWTError
from pydantic import BaseModel
from typing import Optional

router = APIRouter(
    prefix="/api/admin",
    tags=["Admin"]
)

# --- Dependencies ---

def get_current_user_role(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        role: str = payload.get("role")
        if role is None:
            raise HTTPException(status_code=401, detail="Could not validate credentials")
        return role
    except JWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

def require_admin(role: str = Depends(get_current_user_role)):
    if role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    return True

# --- Schemas ---

# --- Schemas ---

class StatusUpdate(BaseModel):
    status: str

class UserCreate(BaseModel):
    email: str
    password: str
    full_name: str
    role: str
    status: str = "active"

# --- Endpoints ---

@router.post("/users")
def create_user(
    user_create: UserCreate,
    db: Session = Depends(get_db),
    is_admin: bool = Depends(require_admin)
):
    # 1. Check if email exists
    if db.query(User).filter(User.email == user_create.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    # 2. Validate Role
    if user_create.role not in ["student", "teacher", "admin"]:
        raise HTTPException(status_code=400, detail="Invalid role")

    try:
        # 3. Create User Record
        from auth import get_password_hash
        hashed_password = get_password_hash(user_create.password)
        
        new_user = User(
            email=user_create.email,
            full_name=user_create.full_name,
            hashed_password=hashed_password,
            role=user_create.role,
            status=user_create.status
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        # 4. Create Role Profile
        if user_create.role == "student":
            db.add(Student(user_id=new_user.id, full_name=new_user.full_name))
        elif user_create.role == "teacher":
            db.add(Teacher(user_id=new_user.id, full_name=new_user.full_name))
        elif user_create.role == "admin":
            db.add(Admin(user_id=new_user.id))
        
        db.commit()
        return {"message": "User created successfully", "user_id": new_user.id, "role": new_user.role}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create user: {str(e)}")

@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    is_admin: bool = Depends(require_admin)
):
    from models import (
        User, Student, Teacher, Admin, 
        Quiz, QuizAttempt, Question, Option, StudentAnswer, 
        StudyGoal, CreateTaskAI, CreateTaskManual, StudentTeacherFollow
    )
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    try:
        # --- Cleanup Logic for Different Roles ---
        
        if user.role == "teacher":
            teacher = db.query(Teacher).filter(Teacher.user_id == user_id).first()
            if teacher:
                # 1. Get all quizzes
                quizzes = db.query(Quiz).filter(Quiz.teacher_id == teacher.id).all()
                for quiz in quizzes:
                    # a. Delete Quiz Attempts and their Answers
                    attempts = db.query(QuizAttempt).filter(QuizAttempt.quiz_id == quiz.id).all()
                    for attempt in attempts:
                        db.query(StudentAnswer).filter(StudentAnswer.attempt_id == attempt.id).delete()
                        db.delete(attempt)
                    
                    # b. Delete Questions, Options, and Answers linked to questions
                    questions = db.query(Question).filter(Question.quiz_id == quiz.id).all()
                    for q in questions:
                        db.query(Option).filter(Option.question_id == q.id).delete()
                        db.query(StudentAnswer).filter(StudentAnswer.question_id == q.id).delete()
                        db.delete(q)
                    
                    db.delete(quiz)
                
                # 2. Delete Follows
                db.query(StudentTeacherFollow).filter(StudentTeacherFollow.teacher_id == teacher.id).delete()
                
                # 3. Delete Teacher Profile
                db.delete(teacher)

        elif user.role == "student":
            student = db.query(Student).filter(Student.user_id == user_id).first()
            if student:
                # 1. Delete Quiz Attempts and Answers
                attempts = db.query(QuizAttempt).filter(QuizAttempt.student_id == student.id).all()
                for attempt in attempts:
                    db.query(StudentAnswer).filter(StudentAnswer.attempt_id == attempt.id).delete()
                    db.delete(attempt)
                
                # 2. Delete Study Goals and AI Tasks
                goals = db.query(StudyGoal).filter(StudyGoal.student_id == student.id).all()
                for goal in goals:
                    db.query(CreateTaskAI).filter(CreateTaskAI.goal_id == goal.goal_id).delete()
                    db.delete(goal)
                
                # 3. Delete Manual Tasks
                db.query(CreateTaskManual).filter(CreateTaskManual.student_id == student.id).delete()
                
                # 4. Delete Follows
                db.query(StudentTeacherFollow).filter(StudentTeacherFollow.student_id == student.id).delete()
                
                # 5. Delete Student Profile
                db.delete(student)

        elif user.role == "admin":
            admin_prof = db.query(Admin).filter(Admin.user_id == user_id).first()
            if admin_prof:
                db.delete(admin_prof)

        # --- Final Cleanup: Delete User Record ---
        db.delete(user)
        db.commit()
        
        return {"message": "User and all associated data deleted successfully"}

    except Exception as e:
        db.rollback()
        print(f"Error deleting user: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete user: {str(e)}")

@router.patch("/users/{user_id}/status")
def update_user_status(
    user_id: int, 
    status_update: StatusUpdate,
    db: Session = Depends(get_db), 
    is_admin: bool = Depends(require_admin)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if status_update.status not in ["active", "inactive"]:
         raise HTTPException(status_code=400, detail="Invalid status")

    user.status = status_update.status
    db.commit()
    db.refresh(user)
    return {"message": "Status updated", "user_id": user.id, "status": user.status}
