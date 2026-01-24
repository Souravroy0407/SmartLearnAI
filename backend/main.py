from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from fastapi.middleware.cors import CORSMiddleware

from api import chat, quiz, study_planner, ai, goals, admin, exams, batches
import auth, models, database, users


# Create Database Tables if strictly necessary, but preferably managed externally
# models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="SmartLearn AI Backend")


# Include Routers

app.include_router(chat.router, prefix="/api/chat", tags=["Doubt Solver"])
app.include_router(quiz.router, prefix="/api/quiz", tags=["Adaptive Quiz"])
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(study_planner.router, prefix="/api/study-planner", tags=["Study Planner"])
app.include_router(ai.router, prefix="/api/ai", tags=["AI Task Generation"])
app.include_router(goals.router, prefix="/api/goals", tags=["Goals"])
app.include_router(admin.router)
app.include_router(exams.router, prefix="/api/exams", tags=["Exams"])
app.include_router(batches.router, prefix="/api/batches", tags=["Batch Management"])


app.include_router(users.router)


# Configure CORS to allow requests from the React frontend
origins = [
    "http://localhost:5173",
    "https://localhost:5173",
    "https://192.168.1.101:5173",
    "https://www.smartlearnai.online",
    "https://smartlearnai01.netlify.app",
    "https://smartlearnai01.netlify.app/",
    "*", # Allow all for simplicity during dev, but explicit above is better for credentials
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi import Request
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    # Log the full error for backend observability
    print(f"CRITICAL DB ERROR: {str(exc)}")
    # Return a safe, generic error message to the client
    return JSONResponse(
        status_code=500,
        content={"detail": "A database error occurred. Please try again later."},
    )

@app.get("/")
def read_root():
    return {"message": "Welcome to SmartLearn AI Backend"}

@app.get("/health")
def health_check(db: Session = Depends(database.get_db)):
    try:
        # Run a lightweight query to check DB connectivity
        db.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        # Log error for backend observability
        print(f"Health check failed: {str(e)}")
        raise HTTPException(
            status_code=503, 
            detail="Service unhealthy: Database connection failed"
        )

import os

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 8000))
    )