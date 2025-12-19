from database import engine
from sqlalchemy import text
import sys

with open("migration_result.txt", "w") as f:
    try:
        f.write("Starting migration...\n")
        with engine.connect() as conn:
            # Postgres specific syntax checks
            # Note: generic SQL doesn't always support IF NOT EXISTS for COLUMN without procedure blocks in some versions, 
            # but Postgres does.
            try:
                conn.execute(text("ALTER TABLE study_tasks ADD COLUMN exam_id INTEGER"))
                f.write("Added column exam_id.\n")
            except Exception as e:
                f.write(f"Column add skipped (maybe exists): {e}\n")
                
            try:
                conn.execute(text("ALTER TABLE study_tasks ADD CONSTRAINT fk_study_tasks_exams FOREIGN KEY (exam_id) REFERENCES exams(id)"))
                f.write("Added constraint.\n")
            except Exception as e:
                 f.write(f"Constraint add skipped: {e}\n")
                 
            conn.commit()
            f.write("Migration SUCCESS.\n")
    except Exception as e:
        f.write(f"Migration CRITICAL FAILURE: {e}\n")
