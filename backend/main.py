from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api import chat, quiz, study_planner, ai, goals
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

app.include_router(users.router)

# Configure CORS to allow requests from the React frontend
origins = [
    "http://localhost:5173",
    "https://localhost:5173",
    "https://192.168.1.101:5173",
    "https://smartlearnai-frontend.netlify.app",
    "https://smartlearnai-frontend.netlify.app/",
    "*", # Allow all for simplicity during dev, but explicit above is better for credentials
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
