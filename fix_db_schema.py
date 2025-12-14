from dotenv import load_dotenv
import os

# Explicitly load backend/.env to get the production DB URL
load_dotenv("backend/.env", override=True)

url = os.getenv("DATABASE_URL")
if url:
    print(f"Loaded DATABASE_URL (partial): {url[:20]}...")
else:
    print("DATABASE_URL not found in env")

from backend.database import engine
from sqlalchemy import text, inspect

def fix_schema():
    print(f"Connecting to: {engine.url}")
    print("Checking database schema...")
    inspector = inspect(engine)
    columns = [col['name'] for col in inspector.get_columns('quizzes')]
    
    if 'deadline' not in columns:
        print("'deadline' column missing in 'quizzes'. Adding it now...")
        with engine.connect() as conn:
            try:
                # Postgres syntax usually just VARCHAR or TEXT. VARCHAR(50) is fine.
                conn.execute(text("ALTER TABLE quizzes ADD deadline VARCHAR(50) NULL"))
                conn.commit()
                print("Successfully added 'deadline' column.")
            except Exception as e:
                print(f"Error adding column: {e}")
    else:
        print("'deadline' column already exists.")

if __name__ == "__main__":
    fix_schema()
