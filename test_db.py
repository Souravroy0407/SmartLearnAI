from backend.database import SessionLocal, engine
from backend.models import User, Base
from sqlalchemy import text

try:
    print("Testing connection...")
    db = SessionLocal()
    
    # Try simple query
    result = db.execute(text("SELECT 1")).scalar()
    print(f"Connection Successful! Test query result: {result}")
    
    # Try creating table (idempotent)
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)
    print("Tables created.")
    
    # Try inserting user
    print("Attempting to insert test user...")
    test_email = "test_script@example.com"
    
    # Check if exists
    existing = db.query(User).filter(User.email == test_email).first()
    if existing:
        print("User already exists, deleting...")
        db.delete(existing)
        db.commit()
    
    new_user = User(email=test_email, full_name="Script Tester", hashed_password="fakehash123")
    db.add(new_user)
    db.commit()
    print("User inserted successfully!")
    
    db.refresh(new_user)
    print(f"User ID: {new_user.id}")
    
except Exception as e:
    print(f"CRITICAL FAILURE: {e}")
finally:
    db.close()
