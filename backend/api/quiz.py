from fastapi import APIRouter
from pydantic import BaseModel
import random

router = APIRouter()

class QuizSubmission(BaseModel):
    answers: dict[str, str]

@router.get("/start")
async def start_quiz():
    # Mock Questions
    return {
        "questions": [
            {
                "id": 1,
                "question": "What is the unit of Force?",
                "options": ["Newton", "Joule", "Pascal", "Watt"],
                "correct": "Newton"
            },
            {
                "id": 2,
                "question": "Which law states F=ma?",
                "options": ["Newtons 1st Law", "Newtons 2nd Law", "Newtons 3rd Law", "Ohms Law"],
                "correct": "Newtons 2nd Law"
            },
            {
                "id": 3,
                "question": "Energy possessed by a body in motion is called?",
                "options": ["Potential Energy", "Kinetic Energy", "Thermal Energy", "Chemical Energy"],
                "correct": "Kinetic Energy"
            }
        ]
    }

@router.post("/submit")
async def submit_quiz(submission: QuizSubmission):
    # Mock Scoring Logic
    score = random.randint(0, 100)
    return {
        "score": score,
        "correct_answers": 3,
        "total_questions": 3,
        "message": "Great job!",
        "accuracy": 100
    }
