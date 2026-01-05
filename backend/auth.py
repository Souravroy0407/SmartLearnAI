from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from pydantic import BaseModel
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone
from database import get_db
from models import User, Student, OtpVerification
from utils.smtp import send_email, get_otp_email_template
import random
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

# Configuration
SECRET_KEY = "supersecretkey" # In production, use environment variable
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440 # Extended to 24 hours

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

# Password Hashing
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

class UserCreate(BaseModel):
    email: str
    password: str
    full_name: str

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class SendOtpRequest(BaseModel):
    email: str

class VerifyOtpRequest(BaseModel):
    email: str
    otp: str

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
    return user

@router.post("/send-signup-otp")
def send_signup_otp(request: SendOtpRequest, db: Session = Depends(get_db)):
    email = request.email.strip().lower()
    
    # Check if user already exists
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Generate OTP
    otp = str(random.randint(1000, 9999))
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)
    
    # Update or Create OTP record
    otp_record = db.query(OtpVerification).filter(OtpVerification.email == email).first()
    if otp_record:
        otp_record.otp = otp
        otp_record.verified = False
        otp_record.expires_at = expires_at
        otp_record.created_at = datetime.now(timezone.utc)
    else:
        otp_record = OtpVerification(
            email=email,
            otp=otp,
            verified=False,
            expires_at=expires_at
        )
        db.add(otp_record)
    
    db.commit()

    # Send Email
    subject = f"SmartLearn AI – Your Verification Code: {otp}"
    plain_body = f"Your SmartLearn AI verification code is:\n\n{otp}\n\nThis code expires in 5 minutes."
    html_body = get_otp_email_template(otp)
    
    if not send_email(email, subject, plain_body, html_body):
        logger.error(f"Failed to send email to {email}")
        raise HTTPException(status_code=500, detail="Failed to send verification email")
        
    return {"message": "OTP sent successfully"}

@router.post("/verify-signup-otp")
def verify_signup_otp(request: VerifyOtpRequest, db: Session = Depends(get_db)):
    email = request.email.strip().lower()
    otp = request.otp.strip()
    
    otp_record = db.query(OtpVerification).filter(OtpVerification.email == email).first()
    
    if not otp_record:
        raise HTTPException(status_code=400, detail="OTP not sent or expired")
    
    if otp_record.otp != otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")
        
    # Check expiry
    if otp_record.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="OTP expired")
        
    otp_record.verified = True
    db.commit()
    
    return {"message": "Email verified successfully"}

@router.post("/register", response_model=Token)
def register(user: UserCreate, db: Session = Depends(get_db)):
    email = user.email.strip().lower()
    
    # 1. Existing User Check
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # 2. Verify OTP Status
    otp_record = db.query(OtpVerification).filter(OtpVerification.email == email).first()
    if not otp_record or not otp_record.verified:
        raise HTTPException(status_code=400, detail="Email not verified. Please verify your email first.")
    
    hashed_password = get_password_hash(user.password)
    new_user = User(email=email, full_name=user.full_name, hashed_password=hashed_password, role="student")
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Create Student Record
    new_student = Student(user_id=new_user.id, full_name=user.full_name)
    db.add(new_student)
    
    # Consume OTP (Delete record)
    db.delete(otp_record)
    db.commit()

    # Include role, full_name and avatar_url in token
    access_token = create_access_token(data={"sub": new_user.email, "role": new_user.role, "full_name": new_user.full_name, "avatar_url": new_user.avatar_url})
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/login", response_model=Token)
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if not db_user or not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if db_user.status == "inactive":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Please contact the administrator.",
        )
    
    # Include role, full_name, and avatar_url in token
    access_token = create_access_token(data={"sub": db_user.email, "role": db_user.role, "full_name": db_user.full_name, "avatar_url": db_user.avatar_url})
    return {"access_token": access_token, "token_type": "bearer"}
