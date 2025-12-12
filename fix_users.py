from backend.database import SessionLocal
from backend.models import User
from backend.auth import get_password_hash

def upsert_user(email, password, role, full_name):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        hashed_pw = get_password_hash(password)
        
        if user:
            print(f"Updating existing user: {email} -> Role: {role}")
            user.hashed_password = hashed_pw
            user.role = role
        else:
            print(f"Creating new user: {email} -> Role: {role}")
            user = User(
                email=email,
                full_name=full_name,
                hashed_password=hashed_pw,
                role=role
            )
            db.add(user)
        
        db.commit()
    except Exception as e:
        print(f"Error upserting {email}: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    print("Fixing all user credentials...")
    upsert_user("admin@gmail.com", "123@", "admin", "Admin User")
    upsert_user("teacher@gmail.com", "123@", "teacher", "Teacher User")
    upsert_user("sr7744941@gmail.com", "123@", "student", "Student User")
    print("Done!")
