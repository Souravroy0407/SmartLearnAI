from sqlalchemy import Column, Integer, String, LargeBinary, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from backend.database import Base

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
    study_tasks = relationship("StudyTask", back_populates="user")

class StudyTask(Base):
    __tablename__ = "study_tasks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String(255))
    task_type = Column(String(50))  # Renamed from type to avoid keyword conflict
    start_time = Column(DateTime)
    duration_minutes = Column(Integer)
    status = Column(String(50), default="pending")
    color = Column(String(50))
    
    user = relationship("User", back_populates="study_tasks")
