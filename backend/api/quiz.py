from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.database import get_db
from backend.models import Quiz, Question, Option, User, QuizAttempt
from pydantic import BaseModel
from datetime import datetime
import google.generativeai as genai
import os
import json
import re
from backend.auth import get_current_user

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
    deadline: Optional[str] = None
    questions: List[QuestionCreate]

class QuizResponse(BaseModel):
    id: int
    title: str
    description: str
    duration_minutes: int
    created_at: Optional[str] = None
    deadline: Optional[str] = None
    questions_count: int

class SubmissionAnswer(BaseModel):
    question_id: int
    selected_option_id: int

class QuizSubmission(BaseModel):
    answers: List[SubmissionAnswer]

class GenerateQuizRequest(BaseModel):
    subject: str
    topic: str
    difficulty: str
    count: int

# --- Endpoints ---

@router.post("/generate-ai")
def generate_quiz_ai(request: GenerateQuizRequest, current_user: User = Depends(get_current_user)):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Gemini API Key not configured")

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-flash-latest')

    prompt = f"""
    Generate {request.count} multiple-choice questions for a quiz.
    
    Subject: {request.subject}
    Topic: {request.topic}
    Difficulty: {request.difficulty}
    
    Provide the response strictly in valid JSON format with the following structure:
    [
        {{
            "text": "Question text here?",
            "options": [
                {{"text": "Option A", "is_correct": false}},
                {{"text": "Option B", "is_correct": true}},
                {{"text": "Option C", "is_correct": false}},
                {{"text": "Option D", "is_correct": false}}
            ]
        }}
    ]
    Ensure there are exactly 4 options per question and exactly one correct answer.
    No markdown code blocks, just raw JSON.
    """

    try:
        response = model.generate_content(prompt)
        text = response.text
        
        # Clean potential markdown formatting
        text = re.sub(r"```json\s*", "", text)
        text = re.sub(r"```", "", text)
        
        questions_data = json.loads(text)
        return questions_data
        
    except Exception as e:
        print(f"AI Generation Error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate quiz: {str(e)}")

@router.post("/")
def create_quiz(quiz_data: QuizCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Use authenticated user ID
    teacher_id = current_user.id
    
    new_quiz = Quiz(
        title=quiz_data.title,
        description=quiz_data.description,
        duration_minutes=quiz_data.duration_minutes,
        teacher_id=teacher_id,
        created_at=datetime.now().isoformat(),
        deadline=quiz_data.deadline
    )
    db.add(new_quiz)
    db.commit()
    db.refresh(new_quiz)

    for q_data in quiz_data.questions:
        new_question = Question(text=q_data.text, quiz_id=new_quiz.id)
        db.add(new_question)
        db.commit()
        db.refresh(new_question)
        
        for opt_data in q_data.options:
            new_option = Option(text=opt_data.text, is_correct=opt_data.is_correct, question_id=new_question.id)
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
            "deadline": q.deadline,
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
    
    # Check deadline
    if quiz.deadline:
        deadline_dt = datetime.fromisoformat(quiz.deadline)
        if datetime.now() > deadline_dt:
             raise HTTPException(status_code=400, detail="Quiz has expired")

    return {
        "id": quiz.id,
        "title": quiz.title,
        "description": quiz.description,
        "duration_minutes": quiz.duration_minutes,
        "deadline": quiz.deadline,
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
    attempt = db.query(QuizAttempt).filter(QuizAttempt.quiz_id == quiz_id, QuizAttempt.student_id == student_id).first()
    
    if attempt:
        return {"status": "attempted", "score": attempt.score}
        
    # Check for expiration
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if quiz and quiz.deadline:
        deadline_dt = datetime.fromisoformat(quiz.deadline)
        if datetime.now() > deadline_dt:
            return {"status": "expired"}
            
    return {"status": "active"}

@router.post("/{quiz_id}/submit")
def submit_quiz(quiz_id: int, submission: QuizSubmission, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    student_id = current_user.id
    
    # Check if already attempted
    existing_attempt = db.query(QuizAttempt).filter(QuizAttempt.quiz_id == quiz_id, QuizAttempt.student_id == student_id).first()
    if existing_attempt:
        raise HTTPException(status_code=400, detail="Quiz already attempted")

    # Check deadline
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if quiz and quiz.deadline:
        deadline_dt = datetime.fromisoformat(quiz.deadline)
        if datetime.now() > deadline_dt:
             raise HTTPException(status_code=400, detail="Time limit exceeded: Quiz has expired")

    score = 0
    total_questions = 0
    
    # Calculate score
    for answer in submission.answers:
        total_questions += 1
        # Check if option is correct (Optimized: fetch option and check is_correct)
        option = db.query(Option).filter(Option.id == answer.selected_option_id).first()
        if option and option.is_correct:
            score += 1
            
    # Record attempt
    new_attempt = QuizAttempt(
        quiz_id=quiz_id,
        student_id=student_id,
        score=score,
        total_questions=total_questions,
        status="completed",
        timestamp=datetime.now().isoformat()
    )
    db.add(new_attempt)
    db.commit()
    db.refresh(new_attempt)
    
    return {"message": "Quiz submitted successfully", "score": score, "total": total_questions}

@router.get("/{quiz_id}/analytics")
def get_quiz_analytics(quiz_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Verify quiz exists and user is owner (or admin)
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    # Ideally check strict ownership: if quiz.teacher_id != current_user.id: ...
    
    attempts = db.query(QuizAttempt, User).join(User, QuizAttempt.student_id == User.id).filter(QuizAttempt.quiz_id == quiz_id).all()
    
    results = []
    for attempt, user in attempts:
        results.append({
            "student_name": user.full_name,
            "score": attempt.score,
            "total": attempt.total_questions,
            "timestamp": attempt.timestamp
        })
        
    return results
