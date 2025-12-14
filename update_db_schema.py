from backend.database import engine
from sqlalchemy import text

def add_deadline_column():
    with engine.connect() as conn:
        try:
            print("Attempting to add 'deadline' column to 'quizzes' table...")
            # Using VARCHAR(50) to match the model definition
            conn.execute(text("ALTER TABLE quizzes ADD deadline VARCHAR(50) NULL"))
            conn.commit()
            print("Successfully added 'deadline' column.")
        except Exception as e:
            print(f"Error (might already exist): {e}")

if __name__ == "__main__":
    add_deadline_column()
