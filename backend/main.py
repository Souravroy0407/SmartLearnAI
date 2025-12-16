from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api import exam, chat, quiz, study_planner
import auth, models, database, users

# Create Database Tables
# Create Database Tables
models.Base.metadata.create_all(bind=database.engine)

# Auto-Run Migration for energy_preference
try:
    from sqlalchemy import text
    with database.engine.connect() as connection:
        connection.execute(text("COMMIT")) # Ensure no transaction overrides
        result = connection.execute(text(
            "SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'energy_preference'"
        )).fetchone()
        if not result:
            print("Migrating: Adding energy_preference column...")
            connection.execute(text("ALTER TABLE users ADD energy_preference VARCHAR(50)"))
            connection.commit()
            print("Migration successful.")
except Exception as e:
    print(f"Migration warning: {e}")

app = FastAPI(title="SmartLearn AI Backend")


# Include Routers
app.include_router(exam.router, prefix="/api/exam", tags=["Exam Checker"])
app.include_router(chat.router, prefix="/api/chat", tags=["Doubt Solver"])
app.include_router(quiz.router, prefix="/api/quiz", tags=["Adaptive Quiz"])
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(study_planner.router, prefix="/api/study-planner", tags=["Study Planner"])
app.include_router(users.router)

# Configure CORS to allow requests from the React frontend
origins = [
    "*", # Allow all origins for mobile testing and development
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to SmartLearn AI Backend"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

import os

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 8000))
    )
