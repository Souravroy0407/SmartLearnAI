from database import engine
from sqlalchemy import text

def add_column():
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE study_tasks ADD COLUMN exam_id INTEGER REFERENCES exams(id)"))
            conn.commit()
            print("Successfully added exam_id column.")
        except Exception as e:
            print(f"Migration failed (might already exist): {e}")

if __name__ == "__main__":
    add_column()
