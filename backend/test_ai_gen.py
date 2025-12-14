
import sys
import os
import requests
import json
import logging

# Ensure we can import from backend
sys.path.append(os.getcwd())

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("test_ai_generation")

BASE_URL = "http://localhost:8000"

def test_ai_generation():
    logger.info("Starting AI generation test...")
    
    # 1. Login (Teacher)
    email = "test_teacher_ai@example.com"
    password = "password123"
    
    # Register/Login
    requests.post(f"{BASE_URL}/api/auth/register", json={
        "email": email, "password": password, "full_name": "Test Teacher", "role": "teacher"
    })
    token_resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": password})
    if token_resp.status_code != 200:
        logger.error("Failed to login")
        return False
    token = token_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Generate Quiz
    payload = {
        "subject": "Python Programming",
        "topic": "Dictionaries",
        "difficulty": "Easy",
        "count": 3
    }
    
    logger.info("Sending generation request...")
    resp = requests.post(f"{BASE_URL}/api/quiz/generate-ai", json=payload, headers=headers)
    
    if resp.status_code != 200:
        logger.error(f"Generation failed: {resp.text}")
        return False
        
    questions = resp.json()
    logger.info(f"Received {len(questions)} questions")
    
    # 3. Validate Structure
    if len(questions) != 3:
        logger.error(f"Expected 3 questions, got {len(questions)}")
        return False
        
    for q in questions:
        if "text" not in q or "options" not in q:
            logger.error("Invalid question structure")
            return False
            
    logger.info("SUCCESS: AI Generation verified!")
    return True

if __name__ == "__main__":
    if test_ai_generation():
        sys.exit(0)
    else:
        sys.exit(1)
