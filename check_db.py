from sqlalchemy import create_engine, inspect
from backend.database import DATABASE_URL
import os

# Override if needed for local sqlite check, but hopefully DATABASE_URL works
if not DATABASE_URL:
    DATABASE_URL = "sqlite:///./sql_app.db" # Default guess

print(f"Checking DB: {DATABASE_URL}")

try:
    engine = create_engine(DATABASE_URL)
    inspector = inspect(engine)
    columns = inspector.get_columns('study_tasks')
    print("Columns in study_tasks:")
    for c in columns:
        print(f"- {c['name']} ({c['type']})")
except Exception as e:
    print(f"Error: {e}")
