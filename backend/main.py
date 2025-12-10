from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api import exam, chat, quiz

app = FastAPI(title="SmartLearn AI Backend")

# Include Routers
app.include_router(exam.router, prefix="/api/exam", tags=["Exam Checker"])
app.include_router(chat.router, prefix="/api/chat", tags=["Doubt Solver"])
app.include_router(quiz.router, prefix="/api/quiz", tags=["Adaptive Quiz"])

# Configure CORS to allow requests from the React frontend
origins = [
    "http://localhost:5173",  # Vite default port
    "http://127.0.0.1:5173",
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
