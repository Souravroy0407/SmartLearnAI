from database import engine
from sqlalchemy import text, inspect

def run_migration():
    print("Starting migration...")
    inspector = inspect(engine)
    columns = [col['name'] for col in inspector.get_columns('study_tasks')]
    
    if 'exam_id' in columns:
        print("Column 'exam_id' already exists in 'study_tasks'.")
    else:
        print("Column 'exam_id' missing. Adding it now...")
        with engine.connect() as conn:
            try:
                # Add column
                conn.execute(text("ALTER TABLE study_tasks ADD COLUMN exam_id INTEGER"))
                # Add constraint separately to avoid issues if constraint naming is strict
                conn.execute(text("ALTER TABLE study_tasks ADD CONSTRAINT fk_study_tasks_exams FOREIGN KEY (exam_id) REFERENCES exams(id)"))
                conn.commit()
                print("Successfully added 'exam_id' column and foreign key constraint.")
            except Exception as e:
                print(f"Migration failed: {e}")

if __name__ == "__main__":
    run_migration()
