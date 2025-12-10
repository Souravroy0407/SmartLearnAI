from passlib.context import CryptContext

try:
    print("Testing Passlib...")
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    hash = pwd_context.hash("password123")
    print(f"Hash created: {hash}")
    valid = pwd_context.verify("password123", hash)
    print(f"Verification: {valid}")
except Exception as e:
    print(f"PASSLIB ERROR: {e}")
