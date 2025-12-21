from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from database import get_db

from models import Quiz, Question, Option, User, QuizAttempt, StudentAnswer, StudentTeacherFollow, Student, Teacher
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
    difficulty: str
    topic: str
    questions: List[QuestionCreate]

class QuizResponse(BaseModel):
    id: int
    title: str
    description: str
    duration_minutes: int
    created_at: Optional[datetime] = None
    deadline: Optional[datetime] = None
    difficulty: Optional[str] = "Medium"
    topic: Optional[str] = "General"
    questions_count: int
    status: Optional[str] = "active"
    score: Optional[int] = None
    attempted_count: Optional[int] = None
    warnings_count: Optional[int] = 0

class SubmissionAnswer(BaseModel):
    question_id: int
    selected_option_id: int

class QuizSubmission(BaseModel):
    answers: List[SubmissionAnswer]
    submission_type: Optional[str] = "manual"
    tab_switch_count: Optional[int] = None

class GenerateQuizRequest(BaseModel):
    subject: str
    topic: str
    difficulty: str
    count: int

# --- Endpoints ---

# ... (skip to list_quizzes)


@router.get("/", response_model=List[QuizResponse])
def list_quizzes(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Role-based Filtering
    if current_user.role == "student":
        if not current_user.student_profile:
             raise HTTPException(status_code=400, detail="Student profile not found")
        
        follows = db.query(StudentTeacherFollow.teacher_id).filter(StudentTeacherFollow.student_id == current_user.student_profile.id).all()
        followed_ids = [f.teacher_id for f in follows]
        
        # Fetch quizzes only from followed teachers
        quizzes = db.query(Quiz).filter(Quiz.teacher_id.in_(followed_ids)).all()
        
    elif current_user.role == "teacher":
        if not current_user.teacher_profile:
             raise HTTPException(status_code=400, detail="Teacher profile not found")

        # Fetch only own quizzes
        quizzes = db.query(Quiz).filter(Quiz.teacher_id == current_user.teacher_profile.id).all()
    else:
        # Admin or others see all? Or nothing? Defaulting to all for Admin.
        quizzes = db.query(Quiz).all()
    
    # Optimize: Fetch all question counts in one query
    question_counts = db.query(Question.quiz_id, func.count(Question.id)).group_by(Question.quiz_id).all()
    counts_map = {quiz_id: count for quiz_id, count in question_counts}
    
    # Fetch attempts for the current user in one query
    # If student, use student_id. If teacher, maybe preview? Assuming student for attempts view.
    # Only fetch if student_id exists
    attempts = []
    if current_user.student_profile:
        student_id = current_user.student_profile.id
        attempts = db.query(QuizAttempt).filter(QuizAttempt.student_id == student_id).all()
    

    attempts_map = {att.quiz_id: att for att in attempts}

    results = []
    now = datetime.utcnow()

    for q in quizzes:
        # Determine status
        status = "active"
        score = None
        attempted_count = None
        
        attempt = attempts_map.get(q.id)
        if attempt:
            status = "attempted"
            score = attempt.score
            attempted_count = attempt.total_questions # Repurposed column for attempted count
        elif q.deadline:
             # Already a datetime object from DB
             if now > q.deadline:
                status = "expired"

        results.append({
            "id": q.id,
            "title": q.title,
            "description": q.description,
            "duration_minutes": q.duration_minutes,
            "created_at": q.created_at,
            "deadline": q.deadline,
            "difficulty": q.difficulty,
            "topic": q.topic,
            "questions_count": counts_map.get(q.id, 0),
            "status": status,
            "score": score,
            "attempted_count": attempted_count
        })
    return results

# ... (skip to submit_quiz)


# ... (inside router)

@router.post("/{quiz_id}/start")
def start_quiz(quiz_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user.student_profile:
         raise HTTPException(status_code=400, detail="Student profile not found")
    student_id = current_user.student_profile.id
    
    # Check if quiz exists
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    # Check for existing attempt
    attempt = db.query(QuizAttempt).filter(QuizAttempt.quiz_id == quiz_id, QuizAttempt.student_id == student_id).first()
    
    if not attempt:
        # Create new attempt with start time
        now_str = datetime.utcnow().isoformat()
        attempt = QuizAttempt(
            quiz_id=quiz_id,
            student_id=student_id,
            start_time=now_str,
            status="started"
        )
        db.add(attempt)
        db.commit()
        db.refresh(attempt)
    elif not attempt.start_time:
        # Backfill start time if missing (e.g. re-entering started quiz)
        attempt.start_time = datetime.utcnow().isoformat()
        db.commit()
    
    return {"message": "Quiz started", "attempt_id": attempt.id, "start_time": attempt.start_time}

@router.post("/{quiz_id}/submit")
def submit_quiz(quiz_id: int, submission: QuizSubmission, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user.student_profile:
         raise HTTPException(status_code=400, detail="Student profile not found")
    student_id = current_user.student_profile.id
    
    # Find existing attempt or create if not exists (handling edge case)
    attempt = db.query(QuizAttempt).filter(QuizAttempt.quiz_id == quiz_id, QuizAttempt.student_id == student_id).first()
    
    if attempt and attempt.status == "completed":
         raise HTTPException(status_code=400, detail="Quiz already submitted")

    # Check deadline
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if quiz and quiz.deadline:
        # Allow small buffer for latency
        if datetime.utcnow() > quiz.deadline:
             pass 

    score = 0
    attempted_count = len(submission.answers)
    
    submitted_option_ids = [answer.selected_option_id for answer in submission.answers]
    
    if submitted_option_ids:
        fetched_options = db.query(Option).filter(Option.id.in_(submitted_option_ids)).all()
        options_map = {opt.id: opt for opt in fetched_options}
    else:
        options_map = {}

    for answer in submission.answers:
        option = options_map.get(answer.selected_option_id)
        if option and option.is_correct:
            score += 1
            
    now_str = datetime.utcnow().isoformat()
    submission_type = getattr(submission, 'submission_type', 'manual') # Handle optional field safely
    tab_switch_count = getattr(submission, 'tab_switch_count', None)

    if not attempt:
        # Fallback if start wasn't called (shouldn't happen in new flow)
        attempt = QuizAttempt(
            quiz_id=quiz_id,
            student_id=student_id,
            start_time=now_str, # Approximation
            status="started"
        )
        db.add(attempt)
    
    # Get actual total questions count from DB
    total_questions_count = db.query(Question).filter(Question.quiz_id == quiz_id).count()

    attempt.score = score
    attempt.total_questions = total_questions_count
    attempt.status = "completed"
    attempt.timestamp = now_str
    attempt.submission_type = submission_type
    attempt.tab_switch_count = tab_switch_count
    
    db.commit()
    db.refresh(attempt)

    # Save Student Answers
    # First clear existing answers for this attempt (retry logic)
    db.query(StudentAnswer).filter(StudentAnswer.attempt_id == attempt.id).delete()
    
    for answer in submission.answers:
        if not answer.selected_option_id:
            continue
            
        option = options_map.get(answer.selected_option_id)
        is_correct = 1 if (option and option.is_correct) else 0
        
        student_ans = StudentAnswer(
            attempt_id=attempt.id,
            question_id=answer.question_id,
            selected_option_id=answer.selected_option_id,
            is_correct=is_correct
        )
        db.add(student_ans)
    
    db.commit()
    
    return {
        "message": "Quiz submitted successfully",
        "quiz_id": quiz_id,
        "student_id": student_id,
        "status": "attempted", # Frontend expects 'attempted' to show Result button
        "score": score,
        "total_questions": attempt.total_questions,
        "percentage": round((score / attempt.total_questions * 100)) if attempt.total_questions > 0 else 0
    }

# ... (AI Generation endpoint remains)

@router.get("/{quiz_id}/analytics")
def get_quiz_analytics(quiz_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Verify quiz exists
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    attempts = db.query(QuizAttempt, User, Student)\
        .join(Student, QuizAttempt.student_id == Student.id)\
        .join(User, Student.user_id == User.id)\
        .filter(
            QuizAttempt.quiz_id == quiz_id,
            QuizAttempt.status == "completed" 
        ).order_by(QuizAttempt.timestamp.desc()).all()
    
    results = []
    for attempt, user, student in attempts:
        # Double check for timestamp validity
        if not attempt.timestamp or attempt.timestamp == "":
            continue

        # Validate and convert timestamps
        time_taken_str = "—"
        if attempt.start_time and attempt.timestamp:
            try:
                start = attempt.start_time
                if isinstance(start, str):
                    start = datetime.fromisoformat(start)
                
                end = attempt.timestamp
                if isinstance(end, str):
                    end = datetime.fromisoformat(end)

                duration = end - start
                
                total_seconds = int(duration.total_seconds())
                minutes = total_seconds // 60
                seconds = total_seconds % 60
                
                if minutes > 0:
                    time_taken_str = f"{minutes}m {seconds}s"
                else:
                    time_taken_str = f"{seconds}s"
            except ValueError:
                pass

        # Use Student name if available, else fallback to User name
        student_name = student.full_name if (student and student.full_name) else user.full_name

        # Calculate attempted count by counting unique StudentAnswers with actual selections
        attempted_count = db.query(StudentAnswer.question_id).filter(
            StudentAnswer.attempt_id == attempt.id,
            StudentAnswer.selected_option_id.isnot(None)
        ).distinct().count()
        
        results.append({
            "id": attempt.id,
            "student_name": student_name,
            "student_email": user.email,
            "score": attempt.score,
            "attempted_count": attempted_count,
            "total_questions": len(quiz.questions) if quiz.questions else 0, # Add total questions info if needed
            "submitted_at": attempt.timestamp,
            "warnings_count": attempt.warnings_count,
            "tab_switch_count": attempt.tab_switch_count,
            "time_taken": time_taken_str, 
            "submission_type": attempt.submission_type or "manual"
        })
        
    return results
# --- AI Generation ---

@router.post("/generate-ai")
def generate_quiz_ai(request: GenerateQuizRequest, current_user: User = Depends(get_current_user)):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Gemini API Key not configured")

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-flash-latest')

    prompt = f"""
    Generate a quiz for the following parameters:
    Subject: {request.subject}
    Topic: {request.topic}
    Difficulty: {request.difficulty}
    Number of Questions: {request.count}
    
    Provide the response strictly in valid JSON format with the following structure:
    {{
        "title": "A creative, short, professional title (e.g., 'Routing Protocols Fundamentals' instead of 'Routing Quiz')",
        "description": "A brief, professional description of what the quiz covers (1-2 sentences).",
        "questions": [
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
    }}
    Ensure there are exactly 4 options per question and exactly one correct answer.
    No markdown code blocks, just raw JSON.
    """

    try:
        response = model.generate_content(prompt)
        text = response.text
        
        # Clean potential markdown formatting
        text = re.sub(r"```json\s*", "", text)
        text = re.sub(r"```", "", text)
        
        quiz_data = json.loads(text)
        return quiz_data
        
    except Exception as e:

        raise HTTPException(status_code=500, detail=f"Failed to generate quiz: {str(e)}")

@router.post("/")
def create_quiz(quiz_data: QuizCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Use authenticated user ID
    if not current_user.teacher_profile:
         raise HTTPException(status_code=400, detail="Teacher profile not found")
    teacher_id = current_user.teacher_profile.id
    
    # Parse deadline if string
    deadline_dt = None
    if quiz_data.deadline:
        try:
            deadline_dt = datetime.fromisoformat(quiz_data.deadline.replace('Z', '+00:00'))
        except ValueError:
            # Handle MM/DD/YYYY etc if needed, or just let it fail/be specific
            pass

    new_quiz = Quiz(
        title=quiz_data.title,
        description=quiz_data.description,
        duration_minutes=quiz_data.duration_minutes,
        teacher_id=teacher_id,
        created_at=datetime.utcnow(), # Use datetime object
        deadline=deadline_dt,      # Use datetime object
        difficulty=quiz_data.difficulty,
        topic=quiz_data.topic
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
        if datetime.utcnow() > quiz.deadline:
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
    # Check teacher profile
    if not current_user.teacher_profile:
         raise HTTPException(status_code=403, detail="Not authorized")

    # Ideally check if quiz belongs to teacher or if user is admin
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
        
    if quiz.teacher_id != current_user.teacher_profile.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this quiz")
    
    # Manual cascade delete to handle Foreign Keys (StudentAnswer -> Option)
    # 1. Delete Student Answers (dependent on QuizAttempt and Option)
    attempts = db.query(QuizAttempt).filter(QuizAttempt.quiz_id == quiz_id).all()
    attempt_ids = [a.id for a in attempts]
    
    if attempt_ids:
        # Use synchronize_session=False for efficient bulk delete without loading objects
        db.query(StudentAnswer).filter(StudentAnswer.attempt_id.in_(attempt_ids)).delete(synchronize_session=False)
        
    # 2. Delete Quiz Attempts
    db.query(QuizAttempt).filter(QuizAttempt.quiz_id == quiz_id).delete(synchronize_session=False)

    # 3. Delete Options (dependent on Question)
    questions = db.query(Question).filter(Question.quiz_id == quiz_id).all()
    question_ids = [q.id for q in questions]
    
    if question_ids:
        db.query(Option).filter(Option.question_id.in_(question_ids)).delete(synchronize_session=False)
    
    # 4. Delete Questions
    db.query(Question).filter(Question.quiz_id == quiz_id).delete(synchronize_session=False)
    
    # 5. Delete Quiz
    db.delete(quiz)
    db.commit()
    return {"message": "Quiz deleted successfully"}

@router.get("/{quiz_id}/status")
def get_quiz_status(quiz_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user.student_profile:
        return {"status": "active"} # Or error?
    student_id = current_user.student_profile.id
    attempt = db.query(QuizAttempt).filter(QuizAttempt.quiz_id == quiz_id, QuizAttempt.student_id == student_id).first()
    
    if attempt:
        return {"status": "attempted", "score": attempt.score}
        
    # Check for expiration
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if quiz and quiz.deadline:
        if datetime.utcnow() > quiz.deadline:
            return {"status": "expired"}
            
    return {"status": "active"}



@router.post("/attempt/{attempt_id}/warning")
def record_warning(attempt_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Verify attempt belongs to user
    if not current_user.student_profile:
         raise HTTPException(status_code=400, detail="Student profile not found")
    attempt = db.query(QuizAttempt).filter(QuizAttempt.id == attempt_id, QuizAttempt.student_id == current_user.student_profile.id).first()
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



@router.get("/{quiz_id}/result", response_model=dict)
def get_student_quiz_result(quiz_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user.student_profile:
         raise HTTPException(status_code=400, detail="Student profile not found")
    student_id = current_user.student_profile.id
    
    # Fetch Attempt
    attempt = db.query(QuizAttempt).filter(
        QuizAttempt.quiz_id == quiz_id,
        QuizAttempt.student_id == student_id,
        QuizAttempt.status == "completed"
    ).first()
    
    if not attempt:
        raise HTTPException(status_code=404, detail="Quiz not attempted or not completed")
    
    # Fetch Quiz Details
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    
    # Fetch Questions and Options
    questions = db.query(Question).filter(Question.quiz_id == quiz_id).all()
    question_ids = [q.id for q in questions]
    
    options = db.query(Option).filter(Option.question_id.in_(question_ids)).all()
    options_map = {opt.id: opt for opt in options}
    
    # Fetch Student Answers
    student_answers = db.query(StudentAnswer).filter(StudentAnswer.attempt_id == attempt.id).all()
    student_answers_map = {sa.question_id: sa for sa in student_answers}
    
    # Construct Detailed Review
    questions_review = []
    correct_count = 0
    wrong_count = 0
    
    for q in questions:
        student_ans = student_answers_map.get(q.id)
        selected_option_id = student_ans.selected_option_id if student_ans else None
        
        # Find correct option for this question
        correct_option = next((opt for opt in options if opt.question_id == q.id and opt.is_correct), None)
        
        is_correct = False
        if selected_option_id:
             selected_opt = options_map.get(selected_option_id)
             if selected_opt and selected_opt.is_correct:
                 is_correct = True
        
        if is_correct:
            correct_count += 1
        elif selected_option_id: # Only count as wrong if attempted
            wrong_count += 1
            
        questions_review.append({
            "id": q.id,
            "text": q.text,
            "options": [
                {
                    "id": opt.id,
                    "text": opt.text,
                    "is_correct": opt.is_correct # Reveal correct answer
                } for opt in options if opt.question_id == q.id
            ],
            "selected_option_id": selected_option_id,
            "correct_option_id": correct_option.id if correct_option else None,
            "is_correct": is_correct
        })

    # Time Calculation
    time_taken_str = "—"
    if attempt.start_time and attempt.timestamp:
        try:
            start = attempt.start_time
            if isinstance(start, str):
                start = datetime.fromisoformat(start)
            
            end = attempt.timestamp
            if isinstance(end, str):
                end = datetime.fromisoformat(end)
                
            duration = end - start
            total_seconds = int(duration.total_seconds())
            
            
            minutes = total_seconds // 60
            seconds = total_seconds % 60
            if minutes > 0:
                time_taken_str = f"{minutes}m {seconds}s"
            else:
                time_taken_str = f"{seconds}s"
        except:
            pass

    # Calculate stats
    # Use set to ensure unique question IDs and filter out stale answers for deleted questions
    current_quiz_question_ids = set(q.id for q in questions)
    answered_ids = {sa.question_id for sa in student_answers 
                    if sa.selected_option_id is not None 
                    and sa.question_id in current_quiz_question_ids}
    
    attempted_count = len(answered_ids)
    actual_total_questions = len(questions) # Source of truth from Quiz definition
    unattempted_count = actual_total_questions - attempted_count
    if unattempted_count < 0: unattempted_count = 0 

    return {
        "quiz_title": quiz.title,
        "score": attempt.score,
        "total_questions": actual_total_questions,
        "percentage": round((attempt.score / actual_total_questions * 100)) if actual_total_questions > 0 else 0,
        "attempted_count": attempted_count,
        "correct_count": correct_count,
        "wrong_count": wrong_count,
        "unattempted_count": unattempted_count,
        "time_taken": time_taken_str,
        "tab_switch_count": attempt.tab_switch_count or 0,
        "submission_type": attempt.submission_type,
        "questions": questions_review
    }
