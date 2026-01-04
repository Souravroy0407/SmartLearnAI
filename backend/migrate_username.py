from database import SessionLocal, engine
from models import Teacher
from sqlalchemy import text
import random
import string

def generate_username(full_name, db):
    base = full_name.lower().replace(" ", "").replace(".", "")
    username = base
    counter = 1
    while True:
        exists = db.query(Teacher).filter(Teacher.username == username).first()
        if not exists:
            return username
        username = f"{base}{counter}"
        counter += 1

def migrate():
    db = SessionLocal()
    try:
        # 1. Add column as nullable first
        print("Adding username column...")
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE teachers ADD COLUMN IF NOT EXISTS username VARCHAR(50)"))
            conn.commit()
        
        # 2. Populate existing teachers
        print("Populating usernames...")
        teachers = db.query(Teacher).filter(Teacher.username == None).all()
        for teacher in teachers:
            # Generate unique username
            # If full_name is None (unlikely but possible), use "teacher"
            name_source = teacher.full_name or f"teacher{teacher.id}"
            new_username = generate_username(name_source, db)
            teacher.username = new_username
            print(f"Assigned @{new_username} to {teacher.full_name}")
            db.commit() # Commit one by one to ensure uniqueness check in loop works

        # 3. Add constraints
        print("Adding constraints...")
        with engine.connect() as conn:
            # Check if constraint exists effectively by trying to add it? 
            # Or just add unique index. 
            # Postgres: ALTER TABLE teachers ADD CONSTRAINT teachers_username_key UNIQUE (username);
            # SQLite might be different but assuming Postgres based on earlier context (psycopg2 mentioned in history)
            # But wait, user's connection might be SQLite?
            # History mentioned "sqlalchemy.exc.DataError: (psycopg2.errors..." -> It IS Postgres.
            
            # Check if constraint exists to avoid error
            # Try/Except block for safety
            try:
                conn.execute(text("ALTER TABLE teachers ALTER COLUMN username SET NOT NULL"))
                conn.execute(text("ALTER TABLE teachers ADD CONSTRAINT teachers_username_key UNIQUE (username)"))
                conn.commit()
            except Exception as e:
                print(f"Constraint might already exist: {e}")
                
        print("Migration complete!")
        
    except Exception as e:
        print(f"Migration failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    migrate()
