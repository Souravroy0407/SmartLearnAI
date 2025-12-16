from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from database import get_db
from models import Quiz, Question, Option, User, QuizAttempt, StudentAnswer
from pydantic import BaseModel
from datetime import datetime
import google.generativeai as genai
import os
import json
import re
from auth import get_current_user

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
    status: Optional[str] = "active"
    score: Optional[int] = None
    warnings_count: Optional[int] = 0

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
def list_quizzes(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    quizzes = db.query(Quiz).all()
    
    # Optimize: Fetch all question counts in one query
    question_counts = db.query(Question.quiz_id, func.count(Question.id)).group_by(Question.quiz_id).all()
    counts_map = {quiz_id: count for quiz_id, count in question_counts}
    
    # Fetch attempts for the current user in one query
    student_id = current_user.id
    attempts = db.query(QuizAttempt).filter(QuizAttempt.student_id == student_id).all()
    attempts_map = {att.quiz_id: att for att in attempts}

    results = []
    now = datetime.now()

    for q in quizzes:
        # Determine status
        status = "active"
        score = None
        
        attempt = attempts_map.get(q.id)
        if attempt:
            status = "attempted"
            score = attempt.score
        elif q.deadline:
            try:
                deadline_dt = datetime.fromisoformat(q.deadline)
                if now > deadline_dt:
                    status = "expired"
            except ValueError:
                pass # Invalid date format fallback

        results.append({
            "id": q.id,
            "title": q.title,
            "description": q.description,
            "duration_minutes": q.duration_minutes,
            "created_at": q.created_at,
            "deadline": q.deadline,
            "questions_count": counts_map.get(q.id, 0),
            "status": status,
            "score": score
        })
    return results

@router.get("/{quiz_id}")
def get_quiz(quiz_id: int, db: Session = Depends(get_db)):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    questions = db.query(Question).filter(Question.quiz_id == quiz_id).all()
    
    # Optimize: Fetch all options for these questions in one query
    question_ids = [q.id for q in questions]
    all_options = []
    if question_ids:
        all_options = db.query(Option).filter(Option.question_id.in_(question_ids)).all()
    
    # Group options by question_id
    options_by_question = {}
    for opt in all_options:
        if opt.question_id not in options_by_question:
            options_by_question[opt.question_id] = []
        options_by_question[opt.question_id].append(opt)

    questions_data = []
    for q in questions:
        # Get options from map instead of DB query
        options = options_by_question.get(q.id, [])
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
    total_questions = len(submission.answers) # Update total based on submission length
    
    # Optimize: Fetch all selected options in one query
    submitted_option_ids = [answer.selected_option_id for answer in submission.answers]
    # Filter only existing and correct options to verify
    # If an option is not found or not correct, it won't be in this list (if we filtered by is_correct=True)
    # But to be safe and simple, let's fetch all submitted options and check in python
    if submitted_option_ids:
        fetched_options = db.query(Option).filter(Option.id.in_(submitted_option_ids)).all()
        options_map = {opt.id: opt for opt in fetched_options}
    else:
        options_map = {}

    # Calculate score
    for answer in submission.answers:
        # Check if option is correct
        option = options_map.get(answer.selected_option_id)
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

    # Save Student Answers
    for answer in submission.answers:
        option = options_map.get(answer.selected_option_id)
        is_correct = 1 if (option and option.is_correct) else 0
        
        student_ans = StudentAnswer(
            attempt_id=new_attempt.id,
            question_id=answer.question_id,
            selected_option_id=answer.selected_option_id,
            is_correct=is_correct
        )
        db.add(student_ans)
    
    db.commit()
    
    return {"message": "Quiz submitted successfully", "score": score, "total": total_questions}

@router.post("/attempt/{attempt_id}/warning")
def record_warning(attempt_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Verify attempt belongs to user
    attempt = db.query(QuizAttempt).filter(QuizAttempt.id == attempt_id, QuizAttempt.student_id == current_user.id).first()
    if not attempt:
         raise HTTPException(status_code=404, detail="Attempt not found")
    
    attempt.warnings_count += 1
    db.commit()
    return {"message": "Warning recorded", "count": attempt.warnings_count}

@router.get("/{quiz_id}/analytics/heatmap")
def get_quiz_heatmap(quiz_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Check quiz exists
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
        
    questions = db.query(Question).filter(Question.quiz_id == quiz_id).all()
    
    results = []
    for q in questions:
        # Aggregate stats
        total_answers = db.query(StudentAnswer).join(QuizAttempt).filter(
            StudentAnswer.question_id == q.id,
            QuizAttempt.quiz_id == quiz_id
        ).count()
        
        correct_answers = db.query(StudentAnswer).join(QuizAttempt).filter(
            StudentAnswer.question_id == q.id,
            StudentAnswer.is_correct == 1,
            QuizAttempt.quiz_id == quiz_id
        ).count()
        
        incorrect_answers = total_answers - correct_answers
        
        results.append({
            "question_id": q.id,
            "text": q.text,
            "correct": correct_answers,
            "incorrect": incorrect_answers,
            "total": total_answers,
            "accuracy": (correct_answers / total_answers * 100) if total_answers > 0 else 0
        })
        
    return results

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
