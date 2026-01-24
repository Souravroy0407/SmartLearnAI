from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os
from dotenv import load_dotenv

load_dotenv(override=True)

# Database URL
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is not set")

# Create Engine
# Updated for robust pooling and IP fallback
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,  # Check connection validity before usage (critical for cloud DBs)
    pool_size=10,        # Baseline number of connections
    max_overflow=20,     # Allow spikes above pool_size
    pool_recycle=1800    # Recycle connections every 30 mins
)

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()