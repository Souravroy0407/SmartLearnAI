from sqlalchemy import Column, Integer, String, LargeBinary, ForeignKey, DateTime, Date
from datetime import datetime
from sqlalchemy.orm import relationship
from database import Base

# ===================== USERS =====================

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True)
    full_name = Column(String(255))
    hashed_password = Column(String(255))
    avatar_url = Column(String(500))
    avatar_data = Column(LargeBinary)
    avatar_content_type = Column(String(50))
    role = Column(String(50))

    teacher_profile = relationship("Teacher", back_populates="user", uselist=False)
    student_profile = relationship("Student", back_populates="user", uselist=False)

# ===================== TEACHERS =====================

class Teacher(Base):
    __tablename__ = "teachers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    full_name = Column(String(255))
    professional_title = Column(String(100))
    bio = Column(String(1000))
    subjects = Column(String(255))
    experience = Column(String(100))
    price_label = Column(String(50))
    education = Column(String(255))
    teaching_languages = Column(String(100))
    teaching_style = Column(String(1000))
    linkedin_url = Column(String(255))
    website_url = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="teacher_profile")
    quizzes = relationship("Quiz", back_populates="teacher")

# ===================== STUDENTS =====================

class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    full_name = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="student_profile")
    quiz_attempts = relationship("QuizAttempt", back_populates="student")

# ===================== STUDENT–TEACHER FOLLOW =====================

class StudentTeacherFollow(Base):
    __tablename__ = "student_teacher_follow"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    teacher_id = Column(Integer, ForeignKey("teachers.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

# ===================== QUIZZES =====================

class Quiz(Base):
    __tablename__ = "quizzes"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(String(500))
    duration_minutes = Column(Integer)
    teacher_id = Column(Integer, ForeignKey("teachers.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    deadline = Column(DateTime)
    difficulty = Column(String(50))
    topic = Column(String(100))

    teacher = relationship("Teacher", back_populates="quizzes")
    attempts = relationship("QuizAttempt", back_populates="quiz", cascade="all, delete-orphan")

# ===================== QUIZ ATTEMPTS =====================

class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"), nullable=False)
    score = Column(Integer)
    total_questions = Column(Integer)
    status = Column(String(50))
    start_time = Column(DateTime)
    timestamp = Column(DateTime)
    submission_type = Column(String(50))
    warnings_count = Column(Integer)
    tab_switch_count = Column(Integer)

    student = relationship("Student", back_populates="quiz_attempts")
    quiz = relationship("Quiz", back_populates="attempts")

# ===================== QUESTIONS =====================

class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"), nullable=False)
    text = Column(String(500), nullable=False)

# ===================== OPTIONS =====================

class Option(Base):
    __tablename__ = "quiz_options"

    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    text = Column(String(255), nullable=False)
    is_correct = Column(Integer)

# ===================== STUDENT ANSWERS =====================

class StudentAnswer(Base):
    __tablename__ = "student_answers"

    id = Column(Integer, primary_key=True, index=True)
    attempt_id = Column(Integer, ForeignKey("quiz_attempts.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    selected_option_id = Column(Integer, ForeignKey("quiz_options.id"), nullable=False)
    is_correct = Column(Integer)

# ===================== STUDY GOALS =====================

class StudyGoal(Base):
    __tablename__ = "study_goal"

    goal_id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    title = Column(String(255), nullable=False)
    type = Column(String(50), nullable=False)
    date = Column(Date, nullable=True)
    current_status = Column(String(50), nullable=False, default='active')
    created_at = Column(DateTime, default=datetime.utcnow)

    tasks = relationship("CreateTaskAI", back_populates="goal", cascade="all, delete-orphan")

# ===================== AI TASKS =====================

class CreateTaskAI(Base):
    __tablename__ = "create_task_AI"

    task_id = Column(Integer, primary_key=True, autoincrement=True)
    goal_id = Column(Integer, ForeignKey("study_goal.goal_id", ondelete="CASCADE"), nullable=False)
    student_id = Column(Integer, nullable=False)
    title = Column(String(255), nullable=False)
    task_time = Column(DateTime, nullable=False)
    task_status = Column(String(50), nullable=False, default='active')
    created_at = Column(DateTime, default=datetime.utcnow)

    goal = relationship("StudyGoal", back_populates="tasks")

# ===================== MANUAL TASKS =====================

class CreateTaskManual(Base):
    __tablename__ = "create_task_manual"

    task_id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(Integer, nullable=False)
    title = Column(String(255), nullable=False)
    task_date = Column(Date, nullable=False)
    colourtag = Column(String(50), nullable=True)
    task_time = Column(DateTime, nullable=True)
    status = Column(String(50), nullable=False, default='pending')
    created_at = Column(DateTime, default=datetime.utcnow)
