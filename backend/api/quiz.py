from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import Quiz, Question, Option, QuizAttempt, User
from backend.auth import get_current_user # Import auth dependency
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

router = APIRouter()

# --- Pydantic Models ---
class OptionCreate(BaseModel):
    text: str
    is_correct: bool

class QuestionCreate(BaseModel):
    text: str
    options: List[OptionCreate]

class QuizCreate(BaseModel):
    title: str
    description: str
    duration_minutes: int
    questions: List[QuestionCreate]

class QuizResponse(BaseModel):
    id: int
    title: str
    description: str
    duration_minutes: int
    created_at: Optional[str] = None
    questions_count: int

class SubmissionAnswer(BaseModel):
    question_id: int
    selected_option_id: int

class QuizSubmission(BaseModel):
    answers: List[SubmissionAnswer]

# --- Endpoints ---

@router.post("/")
def create_quiz(quiz_data: QuizCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Use authenticated user ID
    teacher_id = current_user.id
    
    new_quiz = Quiz(
        title=quiz_data.title,
        description=quiz_data.description,
        duration_minutes=quiz_data.duration_minutes,
        teacher_id=teacher_id,
        created_at=datetime.now().isoformat()
    )
    db.add(new_quiz)
    db.commit()
    db.refresh(new_quiz)

    for q in quiz_data.questions:
        new_question = Question(quiz_id=new_quiz.id, text=q.text)
        db.add(new_question)
        db.commit()
        db.refresh(new_question)

        for opt in q.options:
            new_option = Option(
                question_id=new_question.id,
                text=opt.text,
                is_correct=1 if opt.is_correct else 0
            )
            db.add(new_option)
    
    db.commit()
    return {"message": "Quiz created successfully", "quiz_id": new_quiz.id}

@router.get("/", response_model=List[QuizResponse])
def list_quizzes(db: Session = Depends(get_db)):
    quizzes = db.query(Quiz).all()
    results = []
    for q in quizzes:
        q_count = db.query(Question).filter(Question.quiz_id == q.id).count()
        results.append({
            "id": q.id,
            "title": q.title,
            "description": q.description,
            "duration_minutes": q.duration_minutes,
            "created_at": q.created_at,
            "questions_count": q_count
        })
    return results

@router.get("/{quiz_id}")
def get_quiz(quiz_id: int, db: Session = Depends(get_db)):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    questions = db.query(Question).filter(Question.quiz_id == quiz_id).all()
    questions_data = []
    for q in questions:
        options = db.query(Option).filter(Option.question_id == q.id).all()
        questions_data.append({
            "id": q.id,
            "text": q.text,
            "options": [{"id": opt.id, "text": opt.text} for opt in options] # Exclude is_correct
        })
    
    return {
        "id": quiz.id,
        "title": quiz.title,
        "description": quiz.description,
        "duration_minutes": quiz.duration_minutes,
        "questions": questions_data
    }

@router.delete("/{quiz_id}")
def delete_quiz(quiz_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Ideally check if quiz belongs to teacher or if user is admin
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    # Cascade delete implementation manually if not using cascade in models
    questions = db.query(Question).filter(Question.quiz_id == quiz_id).all()
    for q in questions:
        db.query(Option).filter(Option.question_id == q.id).delete()
    db.query(Question).filter(Question.quiz_id == quiz_id).delete()
    db.query(QuizAttempt).filter(QuizAttempt.quiz_id == quiz_id).delete()
    
    db.delete(quiz)
    db.commit()
    return {"message": "Quiz deleted successfully"}

@router.get("/{quiz_id}/status")
def get_quiz_status(quiz_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    student_id = current_user.id
    attempt = db.query(QuizAttempt).filter(
        QuizAttempt.quiz_id == quiz_id, 
        QuizAttempt.student_id == student_id
    ).first()
    
    if attempt and attempt.status == "completed":
        return {"status": "attempted", "score": attempt.score}
    
    return {"status": "active"}

@router.post("/{quiz_id}/submit")
def submit_quiz(quiz_id: int, submission: QuizSubmission, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    student_id = current_user.id
    
    # Check if already attempted
    existing_attempt = db.query(QuizAttempt).filter(
        QuizAttempt.quiz_id == quiz_id,
        QuizAttempt.student_id == student_id
    ).first()
    
    if existing_attempt and existing_attempt.status == "completed":
        raise HTTPException(status_code=400, detail="You have already attempted this quiz.")

    score = 0
    total_questions = 0
    
    questions = db.query(Question).filter(Question.quiz_id == quiz_id).all()
    total_questions = len(questions)
    
    # Map question IDs to their correct option IDs
    correct_map = {}
    for q in questions:
        correct_opt = db.query(Option).filter(Option.question_id == q.id, Option.is_correct == 1).first()
        if correct_opt:
            correct_map[q.id] = correct_opt.id
            
    for ans in submission.answers:
        if ans.question_id in correct_map:
            if correct_map[ans.question_id] == ans.selected_option_id:
                score += 1

    # Save attempt
    if existing_attempt:
        attempt = existing_attempt
        attempt.score = score
        attempt.status = "completed"
        attempt.timestamp = datetime.now().isoformat()
    else:
        attempt = QuizAttempt(
            student_id=student_id,
            quiz_id=quiz_id,
            score=score,
            total_questions=total_questions,
            status="completed",
            timestamp=datetime.now().isoformat()
        )
        db.add(attempt)
    
    db.commit()
    
    return {
        "score": score,
        "total_questions": total_questions,
        "percentage": (score / total_questions) * 100 if total_questions > 0 else 0
    }

@router.get("/{quiz_id}/analytics")
def get_quiz_analytics(quiz_id: int, db: Session = Depends(get_db)):
    attempts = db.query(QuizAttempt).filter(QuizAttempt.quiz_id == quiz_id).all()
    data = []
    for att in attempts:
        student = db.query(User).filter(User.id == att.student_id).first()
        student_name = student.full_name if student else "Unknown Student"
        data.append({
            "student_name": student_name,
            "score": att.score,
            "total": att.total_questions,
            "timestamp": att.timestamp
        })
    return data
