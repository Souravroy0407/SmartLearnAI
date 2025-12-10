from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

import urllib.parse

# MSSQL Database URL (SQL Authentication)
# Server: DESKTOP-OCEB3CK
# User: sa
# Password: Incorrect@123 (URL encoded as Incorrect%40123)
params = urllib.parse.quote_plus("DRIVER={ODBC Driver 17 for SQL Server};SERVER=DESKTOP-OCEB3CK;DATABASE=SmartLearnAI;UID=sa;PWD=Incorrect@123")
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
