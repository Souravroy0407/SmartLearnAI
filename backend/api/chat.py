from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import time
import random

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    history: list[dict] = []

class ChatResponse(BaseModel):
    response: str
    timestamp: float

@router.post("/chat")
async def chat_with_ai(request: ChatRequest):
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    
    # Simulate processing delay
    time.sleep(1.5)
    
    # Mock AI Responses
    responses = [
        "That's an interesting question! Let's break it down step by step.",
        "Could you provide more context? I want to make sure I give you the best answer.",
        "Based on what you're asking, I recommend checking the laws of thermodynamics.",
        "Here is a simple way to think about it: imagine energy as currency...",
        "Great job asking that! The key concept here is conservation of momentum."
    ]
    
    return {
        "response": random.choice(responses),
        "timestamp": time.time()
    }
