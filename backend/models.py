from sqlalchemy import Column, Integer, String, LargeBinary, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True)
    full_name = Column(String(255))
    hashed_password = Column(String(255))
    avatar_url = Column(String(500))
    avatar_data = Column(LargeBinary)
    avatar_content_type = Column(String(50))
    role = Column(String(50), default="student")
    
    # From remote
    energy_preference = Column(String(50), nullable=True)
    study_tasks = relationship("StudyTask", back_populates="user")
    exams = relationship("Exam", back_populates="user")

class Exam(Base):
    __tablename__ = "exams"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String(255))
    date = Column(DateTime)
    
    user = relationship("User", back_populates="exams")

class Quiz(Base):
    __tablename__ = "quizzes"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(String(500))
    duration_minutes = Column(Integer, default=30)
    teacher_id = Column(Integer, nullable=False) # ForeignKey can be added if Users table relationship is strict
    created_at = Column(String(50)) # Storing as ISO string or datetime
    deadline = Column(String(50), nullable=True) # Optional deadline for the quiz

    # Relationships can be added here if needed, but keeping it simple for now
    # questions = relationship("Question", back_populates="quiz", cascade="all, delete-orphan")

class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, nullable=False, index=True)
    text = Column(String(500), nullable=False)
    
    # options = relationship("Option", back_populates="question", cascade="all, delete-orphan")

class Option(Base):
    __tablename__ = "quiz_options"
    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, nullable=False, index=True)
    text = Column(String(255), nullable=False)
    is_correct = Column(Integer, default=0) # 0 for false, 1 for true

class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, nullable=False, index=True)
    quiz_id = Column(Integer, nullable=False, index=True)
    score = Column(Integer, default=0)
    total_questions = Column(Integer, default=0)
    status = Column(String(50), default="started") # started, completed
    timestamp = Column(String(50))
    warnings_count = Column(Integer, default=0)

    student_answers = relationship("StudentAnswer", back_populates="attempt", cascade="all, delete-orphan")

class StudentAnswer(Base):
    __tablename__ = "student_answers"

    id = Column(Integer, primary_key=True, index=True)
    attempt_id = Column(Integer, ForeignKey("quiz_attempts.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    selected_option_id = Column(Integer, ForeignKey("quiz_options.id"), nullable=False)
    is_correct = Column(Integer, default=0) # Using Integer as Boolean (0/1) for SQLite compatibility

    attempt = relationship("QuizAttempt", back_populates="student_answers")


class StudyTask(Base):
    __tablename__ = "study_tasks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    exam_id = Column(Integer, ForeignKey("exams.id"), nullable=True)
    title = Column(String(255))
    task_type = Column(String(50))  # Renamed from type to avoid keyword conflict
    start_time = Column(DateTime)
    duration_minutes = Column(Integer)
    status = Column(String(50), default="pending")
    color = Column(String(50))
    
    user = relationship("User", back_populates="study_tasks")
    exam = relationship("Exam", backref="tasks")
