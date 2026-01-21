from sqlalchemy import Column, Integer, String, LargeBinary, ForeignKey, DateTime, Date, Boolean, Text, UniqueConstraint, Index, ForeignKeyConstraint
from datetime import datetime, timezone
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
    status = Column(String(50), default="active")  # Added status

    teacher_profile = relationship("Teacher", back_populates="user", uselist=False)
    student_profile = relationship("Student", back_populates="user", uselist=False)
    admin_profile = relationship("Admin", back_populates="user", uselist=False)

# ===================== TEACHERS =====================

class Teacher(Base):
    __tablename__ = "teachers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    username = Column(String(50), unique=True, nullable=False)
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
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="teacher_profile")
    quizzes = relationship("Quiz", back_populates="teacher")
    batches = relationship("TeacherBatch", back_populates="teacher")

# ===================== STUDENTS =====================

class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    username = Column(String(50), unique=True, nullable=False)
    full_name = Column(String(255))
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    user = relationship("User", back_populates="student_profile")
    quiz_attempts = relationship("QuizAttempt", back_populates="student")

# ===================== ADMINS =====================

class Admin(Base):
    __tablename__ = "admins"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="admin_profile")

# ===================== STUDENT–TEACHER FOLLOW =====================

class StudentTeacherFollow(Base):
    __tablename__ = "student_teacher_follow"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    teacher_id = Column(Integer, ForeignKey("teachers.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

# ===================== QUIZZES =====================

class Quiz(Base):
    __tablename__ = "quizzes"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(String(500))
    duration_minutes = Column(Integer)
    teacher_id = Column(Integer, ForeignKey("teachers.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    deadline = Column(DateTime)
    difficulty = Column(String(50))
    subject = Column(String(100)) # Added subject
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
    __tablename__ = "quiz_questions"

    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"), nullable=False)
    text = Column(String(500), nullable=False)

# ===================== OPTIONS =====================

class Option(Base):
    __tablename__ = "quiz_options"

    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, ForeignKey("quiz_questions.id"), nullable=False)
    text = Column(String(255), nullable=False)
    is_correct = Column(Integer)

# ===================== STUDENT ANSWERS =====================

class StudentAnswer(Base):
    __tablename__ = "quiz_answers"

    id = Column(Integer, primary_key=True, index=True)
    attempt_id = Column(Integer, ForeignKey("quiz_attempts.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("quiz_questions.id"), nullable=False)
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
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    tasks = relationship("CreateTaskAI", back_populates="goal", cascade="all, delete-orphan")

# ===================== AI TASKS =====================

class CreateTaskAI(Base):
    __tablename__ = "create_task_ai"   # ⚠️ lowercase to match DB table exactly

    task_id = Column(Integer, primary_key=True, autoincrement=True)
    goal_id = Column(Integer, ForeignKey("study_goal.goal_id", ondelete="CASCADE"),nullable=False)
    student_id = Column(Integer, nullable=False)
    title = Column(String(255), nullable=False)
    # Original field (keep)
    task_time = Column(DateTime, nullable=False)
    # ✅ NEW FIELDS (added)
    task_date = Column(Date, nullable=True)
    duration_minutes = Column(Integer, nullable=True)
    sequence_no = Column(Integer, nullable=True)
    task_status = Column(String(50), nullable=False, default="active")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    # Relationship
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
    duration_minutes = Column(Integer, nullable=False, default=60)
    status = Column(String(50), nullable=False, default='pending')
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

# ===================== OTP VERIFICATION =====================

class OtpVerification(Base):
    __tablename__ = "otp_verification"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False)
    otp = Column(String(4), nullable=False)
    verified = Column(Boolean, default=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

# ===================== EXAMS =====================

class Exam(Base):
    __tablename__ = "exams"

    id = Column(Integer, primary_key=True, index=True)
    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255))
    subject = Column(String(255))
    instructions = Column(Text)
    exam_type = Column(String(50))
    question_format = Column(String(50))
    question_source = Column(String(50))
    question_paper_data = Column(LargeBinary)
    question_paper_mime = Column(String(50))
    total_marks = Column(Integer)
    deadline = Column(DateTime(timezone=True))
    external_link = Column(String(500))
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class ExamQuestion(Base):
    __tablename__ = "exam_questions"

    id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(Integer, ForeignKey("exams.id"), nullable=False)
    question_text = Column(Text)
    marks = Column(Integer)
    order_no = Column(Integer)

class ExamAssignment(Base):
    __tablename__ = "exam_assignments"

    id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(Integer, ForeignKey("exams.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String(50))
    assigned_at = Column(DateTime(timezone=True))

class ExamSubmission(Base):
    __tablename__ = "exam_submissions"

    id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(Integer, ForeignKey("exams.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    answer_sheet_data = Column(LargeBinary)
    answer_sheet_mime = Column(String(50))
    upload_type = Column(String(50))
    submitted_at = Column(DateTime(timezone=True))

class ExamEvaluation(Base):
    __tablename__ = "exam_evaluations"

    id = Column(Integer, primary_key=True, index=True)
    submission_id = Column(Integer, ForeignKey("exam_submissions.id"), nullable=False)
    checked_by = Column(String(50))
    marks = Column(Integer)
    feedback = Column(Text)
    is_final = Column(Boolean)
    checked_at = Column(DateTime(timezone=True))

class ExamReevaluation(Base):
    __tablename__ = "exam_reevaluations"

    id = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, ForeignKey("exam_assignments.id"), nullable=False)
    reason = Column(Text)
    requested_at = Column(DateTime(timezone=True))
    resolved = Column(Boolean)

class ExamEvent(Base):
    __tablename__ = "exam_events"

    id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(Integer, ForeignKey("exams.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    event_type = Column(String(50))
    triggered_by = Column(String(50))
    event_time = Column(DateTime(timezone=True))

# ===================== BATCH MANAGEMENT =====================

class TeacherBatch(Base):
    __tablename__ = "teacher_batches"

    id = Column(Integer, primary_key=True, index=True)
    teacher_id = Column(Integer, ForeignKey("teachers.id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    teacher = relationship("Teacher", back_populates="batches")

    __table_args__ = (
        UniqueConstraint('teacher_id', 'name', name='uix_teacher_batch_name'),
        Index('uix_teacher_default_batch', 'teacher_id', unique=True, postgresql_where=(is_default == True)),
    )

class StudentBatchMap(Base):
    __tablename__ = "student_batch_map"

    id = Column(Integer, primary_key=True, index=True)
    teacher_id = Column(Integer, ForeignKey("teachers.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    batch_id = Column(Integer, ForeignKey("teacher_batches.id"), nullable=False)
    assigned_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        UniqueConstraint('teacher_id', 'student_id', name='uix_teacher_student_map'),
    )

