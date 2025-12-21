from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Response
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from database import get_db
from models import User, StudentTeacherFollow, Teacher, Student
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from auth import SECRET_KEY, ALGORITHM, create_access_token
import io
import time
from datetime import datetime

router = APIRouter(
    prefix="/api/users",
    tags=["users"]
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True

class TeacherResponse(UserResponse):
    bio: Optional[str] = None
    subjects: Optional[str] = None
    experience: Optional[str] = None
    price_label: Optional[str] = None
    
    # Profile V2
    professional_title: Optional[str] = None
    education: Optional[str] = None
    teaching_languages: Optional[str] = None
    teaching_style: Optional[str] = None
    linkedin_url: Optional[str] = None
    website_url: Optional[str] = None
    
    is_following: bool = False

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    
    # Teacher Fields
    bio: Optional[str] = None
    subjects: Optional[str] = None
    experience: Optional[str] = None
    professional_title: Optional[str] = None
    education: Optional[str] = None
    teaching_languages: Optional[str] = None
    teaching_style: Optional[str] = None
    linkedin_url: Optional[str] = None
    website_url: Optional[str] = None

# Dependency to get current user
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Could not validate credentials")
    except JWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")
    
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user

# Dependency to check for Admin Role
def get_current_user_role(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        role: str = payload.get("role")
        if role is None:
            raise HTTPException(status_code=401, detail="Could not validate credentials")
        return role
    except JWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

def require_admin(role: str = Depends(get_current_user_role)):
    if role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    return True

@router.get("/", response_model=List[UserResponse])
def read_users(db: Session = Depends(get_db), is_admin: bool = Depends(require_admin)):
    users = db.query(User).all()
    # Mask binary data in list response if needed, although UserResponse schema prevents showing it unless addressed.
    # UserResponse doesn't have avatar_data field so it's safe.
    return users

@router.get("/me", response_model=TeacherResponse)
def read_user_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role == "teacher":
        teacher_profile = db.query(Teacher).filter(Teacher.user_id == current_user.id).first()
        if teacher_profile:
            # Manually map or let Pydantic handle it if structure matches.
            # We need to construct the response merging User and Teacher fields
            
            # Using the fact that TeacherResponse inherits from UserResponse
            response_data = TeacherResponse.model_validate(current_user) # base fields
            
            # Overwrite with Teacher fields
            response_data.bio = teacher_profile.bio
            response_data.subjects = teacher_profile.subjects
            response_data.experience = teacher_profile.experience
            response_data.price_label = teacher_profile.price_label
            response_data.professional_title = teacher_profile.professional_title
            response_data.education = teacher_profile.education
            response_data.teaching_languages = teacher_profile.teaching_languages
            response_data.teaching_style = teacher_profile.teaching_style
            response_data.linkedin_url = teacher_profile.linkedin_url
            response_data.website_url = teacher_profile.website_url
            response_data.full_name = teacher_profile.full_name or current_user.full_name
            
            return response_data
            
    elif current_user.role == "student":
        student_profile = db.query(Student).filter(Student.user_id == current_user.id).first()
        if student_profile:
            response_data = TeacherResponse.model_validate(current_user)
            response_data.full_name = student_profile.full_name or current_user.full_name
            return response_data
            
    return current_user

@router.patch("/me")
def update_profile(user_update: UserUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Update User table for shared fields (avatar is shared, full_name is migrated but maybe sync?)
    # Request says: "Move teacher-specific fields into a new teachers table"
    # "Authentication must continue using users"
    
    if user_update.avatar_url is not None:
        current_user.avatar_url = user_update.avatar_url

    # For full_name, we update User table (auth) AND role table (display)
    if user_update.full_name is not None:
        current_user.full_name = user_update.full_name
        
    # Extended Profile Update
    if current_user.role == "teacher":
        teacher_profile = db.query(Teacher).filter(Teacher.user_id == current_user.id).first()
        if not teacher_profile:
            # Create if missing (shouldn't happen with migration/register flow but good for safety)
            teacher_profile = Teacher(user_id=current_user.id, full_name=current_user.full_name)
            db.add(teacher_profile)
            
        if user_update.full_name is not None: teacher_profile.full_name = user_update.full_name
        if user_update.bio is not None: teacher_profile.bio = user_update.bio
        if user_update.subjects is not None: teacher_profile.subjects = user_update.subjects
        if user_update.experience is not None: teacher_profile.experience = user_update.experience
        if user_update.professional_title is not None: teacher_profile.professional_title = user_update.professional_title
        if user_update.education is not None: teacher_profile.education = user_update.education
        if user_update.teaching_languages is not None: teacher_profile.teaching_languages = user_update.teaching_languages
        if user_update.teaching_style is not None: teacher_profile.teaching_style = user_update.teaching_style
        if user_update.linkedin_url is not None: teacher_profile.linkedin_url = user_update.linkedin_url
        if user_update.website_url is not None: teacher_profile.website_url = user_update.website_url

    elif current_user.role == "student":
        student_profile = db.query(Student).filter(Student.user_id == current_user.id).first()
        if not student_profile:
            student_profile = Student(user_id=current_user.id, full_name=current_user.full_name)
            db.add(student_profile)
        
        if user_update.full_name is not None: student_profile.full_name = user_update.full_name
        # energy_preference not in UserUpdate schema yet?
        # UserResponse has it, but UserUpdate doesn't seem to have it in the tool output. 
        # I should check UserUpdate definition. UserUpdate in line 48 does NOT have energy_preference.
        # But UserResponse does. Assuming I don't need to add it if it wasn't there.
        # Wait, if I want to update student fields I might need to.
        # But for now, sticking to refactoring existing logic.
    
    db.commit()
    db.refresh(current_user)
    
    # Generate new token with updated info
    # Add timestamp to avatar_url to force cache refresh if it exists
    token_avatar_url = current_user.avatar_url
    if token_avatar_url:
        token_avatar_url = f"{token_avatar_url}?t={int(time.time())}"

    access_token = create_access_token(data={
        "sub": current_user.email, 
        "role": current_user.role, 
        "full_name": current_user.full_name, 
        "avatar_url": token_avatar_url
    })
    
    # Return updated profile (need to recall read_user_me logic or construct it)
    # Re-using read_user_me logic slightly modified for efficiency
    return {
        "user": read_user_me(current_user=current_user, db=db), # Reuse the read function for correct merging
        "access_token": access_token,
        "token_type": "bearer"
    }

@router.post("/upload-avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Read file content
        contents = await file.read()
        
        # Save to database
        current_user.avatar_data = contents
        current_user.avatar_content_type = file.content_type
        
        # Set avatar_url to the endpoint that serves the DB image
        # Using a relative path ensures it works behind proxies/HTTPS
        avatar_url = f"/api/users/{current_user.id}/avatar"
        current_user.avatar_url = avatar_url
        
        db.commit()
        db.refresh(current_user)
        
        # Generate new token with updated info
        # Add timestamp to avatar_url to force cache refresh
        token_avatar_url = f"{current_user.avatar_url}?t={int(time.time())}"
        
        access_token = create_access_token(data={
            "sub": current_user.email, 
            "role": current_user.role, 
            "full_name": current_user.full_name, 
            "avatar_url": token_avatar_url
        })
        
        return {
            "avatar_url": avatar_url,
            "access_token": access_token,
            "token_type": "bearer"
        }
        
    except Exception as e:
        print(f"Error uploading file: {e}")
        raise HTTPException(status_code=500, detail="Could not upload file")

@router.get("/{user_id}/avatar")
def get_user_avatar(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.avatar_data:
        # Return a 404 or a default image? 
        # For valid HTML img tags, 404 is okay, browser handles it.
        raise HTTPException(status_code=404, detail="Avatar not found")
    
    return Response(content=user.avatar_data, media_type=user.avatar_content_type)

@router.get("/teachers", response_model=List[TeacherResponse])
def list_teachers(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Join User and Teacher tables
    teachers_data = db.query(User, Teacher).join(Teacher, User.id == Teacher.user_id).filter(User.role == "teacher").all()
    
    # Get List of IDs that student follows
    followed_teacher_ids = set()
    if current_user.role == "student" and current_user.student_profile:
        follows = db.query(StudentTeacherFollow).filter(StudentTeacherFollow.student_id == current_user.student_profile.id).all()
        followed_teacher_ids = {f.teacher_id for f in follows}
    
    results = []
    for user_obj, teacher_obj in teachers_data:
        # Construct response
        # Construct response
        t_resp = TeacherResponse.model_validate(user_obj)
        
        # Populate teacher fields from Teacher table
        t_resp.bio = teacher_obj.bio
        t_resp.subjects = teacher_obj.subjects
        t_resp.experience = teacher_obj.experience
        t_resp.price_label = teacher_obj.price_label
        t_resp.professional_title = teacher_obj.professional_title
        t_resp.education = teacher_obj.education
        t_resp.teaching_languages = teacher_obj.teaching_languages
        t_resp.teaching_style = teacher_obj.teaching_style
        t_resp.linkedin_url = teacher_obj.linkedin_url
        t_resp.website_url = teacher_obj.website_url
        t_resp.full_name = teacher_obj.full_name or user_obj.full_name

        t_resp.is_following = teacher_obj.id in followed_teacher_ids
        results.append(t_resp)
        
    return results

@router.post("/follow/{teacher_user_id}")
def follow_teacher(teacher_user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # 1. Resolve Student
    if not current_user.student_profile:
         raise HTTPException(status_code=400, detail="Student profile not found")
    student_id = current_user.student_profile.id

    # 2. Resolve Teacher (Input is User ID from UI)
    teacher_profile = db.query(Teacher).filter(Teacher.user_id == teacher_user_id).first()
    if not teacher_profile:
         # Fallback check if they passed the Teacher ID (rare but possible)
         teacher_profile = db.query(Teacher).filter(Teacher.id == teacher_user_id).first()
         if not teacher_profile:
             raise HTTPException(status_code=404, detail="Teacher not found")
    
    teacher_id = teacher_profile.id

    # Check if already following
    existing = db.query(StudentTeacherFollow).filter(
        StudentTeacherFollow.student_id == student_id,
        StudentTeacherFollow.teacher_id == teacher_id
    ).first()
    
    if existing:
        return {"message": "Already following"}
        
    new_follow = StudentTeacherFollow(
        student_id=student_id,
        teacher_id=teacher_id,
        created_at=datetime.utcnow()
    )
    db.add(new_follow)
    db.commit()
    return {"message": "Followed successfully"}

@router.post("/unfollow/{teacher_user_id}")
def unfollow_teacher(teacher_user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user.student_profile:
         raise HTTPException(status_code=400, detail="Student profile not found")
    student_id = current_user.student_profile.id

    # Resolve Teacher
    teacher_profile = db.query(Teacher).filter(Teacher.user_id == teacher_user_id).first()
    if not teacher_profile:
         teacher_profile = db.query(Teacher).filter(Teacher.id == teacher_user_id).first()
    
    if not teacher_profile:
        raise HTTPException(status_code=404, detail="Teacher not found")
        
    teacher_id = teacher_profile.id

    follow = db.query(StudentTeacherFollow).filter(
        StudentTeacherFollow.student_id == student_id,
        StudentTeacherFollow.teacher_id == teacher_id
    ).first()
    
    if not follow:
        raise HTTPException(status_code=404, detail="Not following this teacher")
        
    db.delete(follow)
    db.commit()
    return {"message": "Unfollowed successfully"}
