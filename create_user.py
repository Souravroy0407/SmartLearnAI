from backend.database import SessionLocal
from backend.models import User
from backend.auth import get_password_hash

db = SessionLocal()
email = "debug@test.com"
password = "password123"

try:
    user = db.query(User).filter(User.email == email).first()
    if not user:
        new_user = User(
            email=email,
            full_name="Debug User",
            hashed_password=get_password_hash(password),
            role="student"
        )
        db.add(new_user)
        db.commit()
        print(f"User created: {email} / {password}")
    else:
        print(f"User already exists: {email} / {password}")
except Exception as e:
    print(f"Error creating user: {e}")
finally:
    db.close()
