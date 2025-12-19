from database import engine
from sqlalchemy import inspect
import sys

with open("db_status.txt", "w") as f:
    try:
        print("Connecting to DB for inspection...")
        inspector = inspect(engine)
        columns = [col['name'] for col in inspector.get_columns('study_tasks')]
        f.write(f"Columns in study_tasks: {columns}\n")
        if 'exam_id' in columns:
            f.write("exam_id exists.\n")
        else:
            f.write("exam_id MISSING.\n")
    except Exception as e:
        f.write(f"Error: {e}\n")
print("Verification complete.")
