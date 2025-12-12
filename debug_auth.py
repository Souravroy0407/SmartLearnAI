from backend.database import SessionLocal, DATABASE_URL
from backend.models import User
from backend.auth import get_password_hash, verify_password

print(f"DEBUG: Using DB URL: {DATABASE_URL}")

def debug_user_auth(email, password="123@"):
    db = SessionLocal()
    try:
        # 1. Update User
        user = db.query(User).filter(User.email == email).first()
        hashed_pw = get_password_hash(password)
        
        if user:
            print(f"Updating {email}...")
            user.hashed_password = hashed_pw
        else:
            print(f"Creating {email}...")
            user = User(email=email, full_name="Test User", hashed_password=hashed_pw, role="student")
            db.add(user)
        
        db.commit()
        db.refresh(user)
        print(f"Saved Hash: {user.hashed_password}")
        
        # 2. Verify Immediately
        is_valid = verify_password(password, user.hashed_password)
        print(f"Verification Result for '{password}': {is_valid}")
        
        if is_valid:
            print("SUCCESS: Database and Hashing are consistent.")
        else:
            print("FAILURE: Hash verification failed immediately.")
            
    except Exception as e:
        print(f"ERROR: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    debug_user_auth("admin@gmail.com")
