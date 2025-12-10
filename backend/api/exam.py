from fastapi import APIRouter, UploadFile, File, HTTPException
import time
import random

router = APIRouter()

@router.post("/analyze")
async def analyze_exam(file: UploadFile = File(...)):
    if not file.filename.endswith(('.pdf', '.jpg', '.png', '.jpeg')):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a PDF or Image.")
    
    # Simulate processing delay
    time.sleep(2)
    
    # Mock Response Data
    return {
        "filename": file.filename,
        "score": random.randint(65, 95),
        "total_marks": 100,
        "subject": "Physics - Midterm",
        "strengths": [
            "Strong understanding of Kinematics concepts.",
            "Correct application of Newton's Second Law.",
            "Clear diagrams and labeling."
        ],
        "weaknesses": [
            "Calculation error in Rotational Motion (Q12).",
            "Missed units in final answers for Thermodynamics."
        ],
        "tips": [
            "Review the formula for Moment of Inertia.",
            "Practice unit conversion problems."
        ],
        "topic_performance": {
            "Kinematics": 85,
            "Dynamics": 72,
            "Thermodynamics": 60,
            "Waves & Optics": 65,
            "Modern Physics": 90
        }
    }
