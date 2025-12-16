from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import google.generativeai as genai
import os
import time

# Load environment variables
from dotenv import load_dotenv
from pathlib import Path

# Explicitly load .env from project root
env_path = Path(__file__).resolve().parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

router = APIRouter()

# Configure Gemini
GENAI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GENAI_API_KEY:
    print("WARNING: GEMINI_API_KEY not found environment variables. Doubt Solver will not work.")
else:
    genai.configure(api_key=GENAI_API_KEY)

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
    
    if not GENAI_API_KEY:
         raise HTTPException(status_code=500, detail="Server misconfiguration: API Key missing.")

    try:
        # Initialize the model
        model = genai.GenerativeModel('gemini-flash-latest')
        
        # Prepare chat history if needed (Gemini supports history, but we'll start simple)
        # For now, we'll just send the current message as a prompt.
        # Ideally, map 'history' from request to Gemini's expected format.
        
        chat = model.start_chat(history=[]) # You can convert request.history here
        
        response = chat.send_message(request.message)
        
        return {
            "response": response.text,
            "timestamp": time.time()
        }
    except Exception as e:
        print(f"Gemini API Error: {e}")
        raise HTTPException(status_code=500, detail=f"AI Error: {str(e)}")
