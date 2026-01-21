from sqlalchemy import inspect
from database import engine

def check_columns():
    inspector = inspect(engine)
    columns = [c['name'] for c in inspector.get_columns('teacher_batches')]
    print("Columns in teacher_batches:", columns)
    
    required = ['run_days', 'start_time', 'end_time', 'timezone', 'status']
    missing = [col for col in required if col not in columns]
    
    if missing:
        print(f"MISSING COLUMNS: {missing}")
        exit(1)
    else:
        print("All columns present.")
        exit(0)

if __name__ == "__main__":
    check_columns()
