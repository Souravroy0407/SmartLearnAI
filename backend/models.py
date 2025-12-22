from sqlalchemy import Column, Integer, String, LargeBinary, ForeignKey, DateTime
from datetime import datetime
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
    
    
    # Relationships
    teacher_profile = relationship("Teacher", back_populates="user", uselist=False)
    student_profile = relationship("Student", back_populates="user", uselist=False)

class Teacher(Base):
    __tablename__ = "teachers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    full_name = Column(String(255))
    professional_title = Column(String(100), nullable=True)
    bio = Column(String(1000), nullable=True)
    subjects = Column(String(255), nullable=True)
    experience = Column(String(100), nullable=True)
    price_label = Column(String(50), default="Free")
    education = Column(String(255), nullable=True)
    teaching_languages = Column(String(100), nullable=True)
    teaching_style = Column(String(1000), nullable=True)
    linkedin_url = Column(String(255), nullable=True)
    website_url = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="teacher_profile")
    quizzes = relationship("Quiz", back_populates="teacher")
    exams = relationship("Exam", back_populates="teacher")

class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    full_name = Column(String(255))
    #energy_preference = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="student_profile")
    quiz_attempts = relationship("QuizAttempt", back_populates="student")
    study_tasks = relationship("StudyTask", back_populates="student")
    # exams relationship removed (Exams are Teacher resources)

class StudentTeacherFollow(Base):
    __tablename__ = "student_teacher_follow"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    teacher_id = Column(Integer, ForeignKey("teachers.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    student = relationship("Student", backref="followed_teachers")
    teacher = relationship("Teacher", backref="student_followers")

class Exam(Base):
    __tablename__ = "exams"

    id = Column(Integer, primary_key=True, index=True)
    teacher_id = Column(Integer, ForeignKey("teachers.id"), nullable=True)
    teacher_id = Column(Integer, ForeignKey("teachers.id"), nullable=True)

    title = Column(String(255))
    
    # Legacy field for Study Planner (keep optional or map to deadline)
    date = Column(DateTime, nullable=True)
    
    # Extended Exam Fields
    instructions = Column(String(1000))
    exam_type = Column(String(50)) # fileupload, googleform
    duration_minutes = Column(Integer)
    deadline = Column(String(50)) # ISO Format
    external_link = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    teacher = relationship("Teacher", back_populates="exams")
    teacher = relationship("Teacher", back_populates="exams")

    submissions = relationship("ExamSubmission", back_populates="exam", cascade="all, delete-orphan")
    tasks = relationship("StudyTask", back_populates="exam") # Backref updated

class ExamSubmission(Base):
    __tablename__ = "exam_submissions"

    id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(Integer, ForeignKey("exams.id"))
    student_id = Column(Integer, ForeignKey("students.id"))
    submitted_at = Column(DateTime, default=datetime.utcnow)
    file_path = Column(String(500), nullable=True) # For file upload
    status = Column(String(50), default="submitted") # submitted, graded
    marks_obtained = Column(Integer, nullable=True)
    feedback = Column(String(1000), nullable=True)
    
    exam = relationship("Exam", back_populates="submissions")
    student = relationship("Student", backref="exam_submissions")

class Quiz(Base):
    __tablename__ = "quizzes"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(String(500))
    duration_minutes = Column(Integer, default=30)
    teacher_id = Column(Integer, ForeignKey("teachers.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    deadline = Column(DateTime, nullable=True)
    difficulty = Column(String(50), nullable=False)
    topic = Column(String(100), nullable=False)

    teacher = relationship("Teacher", back_populates="quizzes")
    attempts = relationship("QuizAttempt", back_populates="quiz", cascade="all, delete-orphan")

    # Relationships can be added here if needed, but keeping it simple for now
    # questions = relationship("Question", back_populates="quiz", cascade="all, delete-orphan")

class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"), nullable=False, index=True)
    text = Column(String(500), nullable=False)
    
    # options = relationship("Option", back_populates="question", cascade="all, delete-orphan")

class Option(Base):
    __tablename__ = "quiz_options"
    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False, index=True)
    text = Column(String(255), nullable=False)
    is_correct = Column(Integer, default=0) # 0 for false, 1 for true

class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False, index=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"), nullable=False, index=True)
    score = Column(Integer, default=0)
    total_questions = Column(Integer, default=0)
    status = Column(String(50), default="started") # started, completed
    timestamp = Column(DateTime, default=datetime.utcnow) # This is effectively end_time
    start_time = Column(DateTime, nullable=True)
    submission_type = Column(String(50), default="manual") # manual, auto_timeout
    warnings_count = Column(Integer, default=0)
    tab_switch_count = Column(Integer, nullable=True)

    student = relationship("Student", back_populates="quiz_attempts")
    quiz = relationship("Quiz", back_populates="attempts")

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
    student_id = Column(Integer, ForeignKey("students.id"))
    exam_id = Column(Integer, ForeignKey("exams.id"), nullable=True)
    title = Column(String(255))
    task_type = Column(String(50))  # Renamed from type to avoid keyword conflict
    start_time = Column(DateTime)
    duration_minutes = Column(Integer)
    status = Column(String(50), default="pending")
    color = Column(String(50))
    
    student = relationship("Student", back_populates="study_tasks")
    exam = relationship("Exam", back_populates="tasks")
