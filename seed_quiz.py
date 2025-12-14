from sqlalchemy.orm import Session
from backend.database import SessionLocal, engine
from backend.models import Base, Quiz, Question, Option, User
from passlib.context import CryptContext

db = SessionLocal()

def seed_quiz():
    # Ensure we have a teacher
    teacher_email = "teacher@smartlearn.ai"
    teacher = db.query(User).filter(User.email == teacher_email).first()
    if not teacher:
        pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")
        teacher = User(
            email=teacher_email,
            full_name="Physics Teacher",
            hashed_password=pwd_context.hash("teacher123"),
            role="teacher"
        )
        db.add(teacher)
        db.commit()
        db.refresh(teacher)
        print(f"Created teacher: {teacher.email}")

    # Check if quiz exists
    quiz = db.query(Quiz).first()
    if not quiz:
        print("Creating sample quiz...")
        new_quiz = Quiz(
            title="Physics Basics",
            description="Introduction to Mechanics",
            duration_minutes=30,
            teacher_id=teacher.id
        )
        db.add(new_quiz)
        db.commit()
        db.refresh(new_quiz)

        questions_data = [
            {
                "text": "What is the SI unit of Force?",
                "options": [
                    {"text": "Newton", "is_correct": True},
                    {"text": "Joule", "is_correct": False},
                    {"text": "Pascal", "is_correct": False},
                    {"text": "Watt", "is_correct": False}
                ]
            },
            {
                "text": "Which law states F=ma?",
                "options": [
                    {"text": "Newton's First Law", "is_correct": False},
                    {"text": "Newton's Second Law", "is_correct": True},
                    {"text": "Newton's Third Law", "is_correct": False},
                    {"text": "Ohm's Law", "is_correct": False}
                ]
            }
        ]

        for q in questions_data:
            question = Question(quiz_id=new_quiz.id, text=q["text"])
            db.add(question)
            db.commit()
            db.refresh(question)
            
            for opt in q["options"]:
                option = Option(question_id=question.id, text=opt["text"], is_correct=opt["is_correct"])
                db.add(option)
        
        db.commit()
        print("Sample quiz created!")
    else:
        print("Quiz already exists.")

if __name__ == "__main__":
    try:
        seed_quiz()
    except Exception as e:
        print(f"Error seeding: {e}")
    finally:
        db.close()
