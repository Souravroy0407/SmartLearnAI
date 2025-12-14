from backend.database import SessionLocal
from backend.models import Quiz, Question
import sys

def debug_query():
    db = SessionLocal()
    from backend.database import engine
    print(f"Connecting to: {engine.url}")
    try:
        print("Querying all quizzes...")
        quizzes = db.query(Quiz).all()
        print(f"Found {len(quizzes)} quizzes.")
        for q in quizzes:
            print(f"ID: {q.id}, Title: {q.title}, Deadline: {q.deadline}")
            q_count = db.query(Question).filter(Question.quiz_id == q.id).count()
            print(f"  Questions: {q_count}")
    except Exception as e:
        print(f"Query failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    debug_query()
