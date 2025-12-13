from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

import urllib.parse

import os
from dotenv import load_dotenv

load_dotenv()

# Database URL
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    # Fallback to MSSQL/Local if needed, or raise error
    # Keeping old logic as backup/reference if migration fails immediately, 
    # but preferably we just use the URL provided.
    SERVER = os.getenv("DB_SERVER", "DESKTOP-OCEB3CK")
    USER = os.getenv("DB_USER", "sa")
    PASSWORD = os.getenv("DB_PASSWORD", "")
    DATABASE = os.getenv("DB_NAME", "SmartLearnAI")
    params = urllib.parse.quote_plus(f"DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={SERVER};DATABASE={DATABASE};UID={USER};PWD={PASSWORD}")
    DATABASE_URL = "mssql+pyodbc:///?odbc_connect=%s" % params

# Create Engine
engine = create_engine(DATABASE_URL)

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
