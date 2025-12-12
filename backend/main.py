from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api import exam, chat, quiz
from backend import auth, models, database, users

# Create Database Tables
# Create Database Tables
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="SmartLearn AI Backend")


# Include Routers
app.include_router(exam.router, prefix="/api/exam", tags=["Exam Checker"])
app.include_router(chat.router, prefix="/api/chat", tags=["Doubt Solver"])
app.include_router(quiz.router, prefix="/api/quiz", tags=["Adaptive Quiz"])
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
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

if __name__ == "__main__":
    import uvicorn
    # This matches the command line: uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
