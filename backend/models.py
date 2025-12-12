from sqlalchemy import Column, Integer, String, LargeBinary
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
