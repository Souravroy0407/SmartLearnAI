from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional, List
import json
from datetime import datetime
from database import get_db
from models import User, Exam, ExamQuestion
from auth import get_current_user

router = APIRouter()

@router.post("/", response_model=dict)
async def create_exam(
    title: str = Form(...),
    subject: str = Form(...),
    instructions: str = Form(None),
    exam_type: str = Form(...), # subjective, external
    question_format: str = Form(None), # pdf, text (required if exam_type=subjective)
    question_source: str = Form(None), # teacher, ai (optional, default teacher)
    total_marks: int = Form(...),
    deadline: str = Form(...), # ISO format string
    external_link: str = Form(None),
    # For question_format=text
    questions_json: str = Form(None), # JSON string of list of objects {text, marks, order_no}
    # For question_format=pdf
    question_paper: UploadFile = File(None),
    
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Validation: Role check
    if current_user.role != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers can create exams"
        )
        
    # 2. Validation: Exam Type
    if exam_type not in ["subjective", "external"]:
        raise HTTPException(status_code=400, detail="Invalid exam_type. Must be 'subjective' or 'external'")
        
    # 3. Validation: External Exam
    if exam_type == "external":
        if not external_link:
            raise HTTPException(status_code=400, detail="external_link is required for external exams")
        question_format = None # force null
        question_paper = None
    
    # 4. Validation: Subjective Exam
    if exam_type == "subjective":
        if question_format not in ["pdf", "text"]:
             raise HTTPException(status_code=400, detail="question_format must be 'pdf' or 'text' for subjective exams")
             
        if question_format == "pdf":
            if not question_paper:
                 raise HTTPException(status_code=400, detail="question_paper file is required for pdf format")
        
        if question_format == "text":
            if not questions_json:
                 raise HTTPException(status_code=400, detail="questions_json is required for text format")

    # 5. Process Deadline to UTC
    # Expecting ISO 8601 string, e.g., "2023-10-27T10:00:00Z" or with offset
    # Ideally frontend sends UTC ISO string. We store as is (assuming models handle datetime or we parse it)
    # The DB model asks for DateTime(timezone=True). 
    # Let's try to parse it to ensure validity
    try:
        # replace Z with +00:00 to be safe for fromisoformat in older pythons if needed, 
        # but modern python handles it.
        deadline_dt = datetime.fromisoformat(deadline.replace('Z', '+00:00'))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid deadline format. Use ISO 8601")

    # 6. Read File Content if PDF
    paper_data = None
    paper_mime = None
    if question_paper:
        paper_data = await question_paper.read()
        paper_mime = question_paper.content_type

    # 7. Create Exam Record
    new_exam = Exam(
        teacher_id=current_user.id,
        title=title,
        subject=subject,
        instructions=instructions,
        exam_type=exam_type,
        question_format=question_format,
        question_source=question_source or "teacher",
        question_paper_data=paper_data,
        question_paper_mime=paper_mime,
        total_marks=total_marks,
        deadline=deadline_dt,
        external_link=external_link,
        # created_at is automatic
    )
    
    db.add(new_exam)
    db.flush() # flush to get new_exam.id

    # 8. Process Text Questions
    if exam_type == "subjective" and question_format == "text" and questions_json:
        try:
            questions_list = json.loads(questions_json)
            if not isinstance(questions_list, list) or len(questions_list) == 0:
                 raise HTTPException(status_code=400, detail="questions_json must be a non-empty list")
            
            for q in questions_list:
                # expecting { "question_text": "...", "marks": 5, "order_no": 1 }
                new_q = ExamQuestion(
                    exam_id=new_exam.id,
                    question_text=q.get("question_text"),
                    marks=q.get("marks", 0),
                    order_no=q.get("order_no", 0)
                )
                db.add(new_q)
                
        except json.JSONDecodeError:
            db.rollback()
            raise HTTPException(status_code=400, detail="Invalid JSON for questions_json")
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=400, detail=f"Error processing questions: {str(e)}")

    db.commit()
    db.refresh(new_exam)
    
    return {"status": "success", "exam_id": new_exam.id, "message": "Exam created successfully"}
