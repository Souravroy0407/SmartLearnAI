from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from pydantic import BaseModel
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone
from database import get_db
from models import User, Student, OtpVerification
from utils.email_templates import get_otp_email_template, get_password_reset_template
from utils.brevo_email import send_email
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

class ForgotPasswordRequest(BaseModel):
    email: str

class VerifyResetOtpRequest(BaseModel):
    email: str
    otp: str

class ResetPasswordRequest(BaseModel):
    email: str
    otp: str
    new_password: str

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
    
    if not send_email(email, subject, html_body):
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

@router.post("/forgot-password")
def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_db)):
    email = request.email.strip().lower()
    
    # Check if user exists
    user = db.query(User).filter(User.email == email).first()
    if not user:
        # Security: Do not reveal if email exists, but return success to prevent enum attacks
        # However, for this project, we might want to return actual error if user not found for UX
        # Decision: Return 404 to be helpful for now, or 200 with no-op. 
        # Requirement says: "Backend checks: Email exists in users table"
        # Requirement says: "Return success message 'OTP sent...'"
        # Requirement says: "Security Rules: Do NOT reveal whether email exists in error messages."
        # Contradiction? "Backend checks email exists" vs "Do not reveal".
        # Standard practice: If email not found, just return 200 and do nothing.
        # BUT, user wants to "Generate OTP" only if "Email exists".
        # So if email DOES NOT exist, we should probably just return 200 and NOT send email.
        # But for debugging/testing, I will return 404 if email not found, 
        # UNLESS strict security is paramount. The prompt says "Do NOT reveal whether email exists in error messages."
        # OK, so I must return 200 even if email not found.
        # BUT, the prompt also says "Backend checks: Email exists".
        # So:
        # If user exists -> Send OTP -> Return 200 "OTP sent"
        # If user !exists -> Do nothing -> Return 200 "OTP sent" (Fake success)
        
        # ACTUALLY, checking the requirement strictly:
        # "Step 1 ... 3. Backend checks: Email exists ... 7. Return success message"
        # "Security Rules: Do NOT reveal whether email exists in error messages."
        
        # So if I return "Email not found" that violates the rule.
        # So I will pretend to send it.
        return {"message": "OTP sent to your email"}

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

    # Log OTP for manual verification (As per plan)
    logger.info(f"===== FORGOT PASSWORD OTP for {email}: {otp} =====")

    # Send Email
    subject = "Reset Your Password - SmartLearn AI"
    plain_body = f"Your SmartLearn AI password reset code is:\n\n{otp}\n\nThis code expires in 5 minutes."
    html_body = get_password_reset_template(otp)
    
    if not send_email(email, subject, html_body):
        logger.error(f"Failed to send email to {email}")
        # In a real scenario, we might want to return error here, but to avoid enumeration?
        # If email sending fails, it's a server error.
        raise HTTPException(status_code=500, detail="Failed to send verification email")
        
    return {"message": "OTP sent to your email"}

@router.post("/verify-reset-otp")
def verify_reset_otp(request: VerifyResetOtpRequest, db: Session = Depends(get_db)):
    email = request.email.strip().lower()
    otp = request.otp.strip()
    
    otp_record = db.query(OtpVerification).filter(OtpVerification.email == email).first()
    
    if not otp_record:
        raise HTTPException(status_code=400, detail="Invalid OTP or specified email has no pending request")
    
    if otp_record.otp != otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")
        
    # Check expiry
    if otp_record.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="OTP expired")
    
    # We DO NOT delete it here, we mark it verified? 
    # Actually for "Forgot Password", the final step is "Reset Password".
    # The frontend just wants to know "Is this OTP correct?" to move to next step.
    # We can mark it verified, but the final step must re-verify.
    
    otp_record.verified = True
    db.commit()
    
    return {"message": "OTP verified"}

@router.post("/reset-password")
def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    email = request.email.strip().lower()
    otp = request.otp.strip()
    new_password = request.new_password
    
    # 1. Verify OTP Again (Critical Security)
    otp_record = db.query(OtpVerification).filter(OtpVerification.email == email).first()
    if not otp_record:
         raise HTTPException(status_code=400, detail="Invalid request")
         
    if otp_record.otp != otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")
        
    if otp_record.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="OTP expired")
        
    if not otp_record.verified:
         # Ensure the previous step was actually passed? 
         # Or just trust the OTP if provided again?
         # The requirement says "Do NOT allow password reset without OTP verification".
         # Since we check OTP here again, that satisfied it. 
         # We can also check `.verified` if we want to enforce the flow order.
         pass

    # 2. Get User
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # 3. Request Password Reset
    hashed_password = get_password_hash(new_password)
    user.hashed_password = hashed_password
    
    # 4. Invalidate OTP (Delete it)
    db.delete(otp_record)
    
    db.commit()
    
    return {"message": "Password reset successful"}

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
