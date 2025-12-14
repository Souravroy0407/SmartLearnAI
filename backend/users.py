from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Response
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from backend.database import get_db
from backend.models import User
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from backend.auth import SECRET_KEY, ALGORITHM, create_access_token
import io
import time

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
    energy_preference: Optional[str] = None

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None

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

@router.get("/me", response_model=UserResponse)
def read_user_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.patch("/me")
def update_profile(user_update: UserUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user_update.full_name is not None:
        current_user.full_name = user_update.full_name
    # Allow avatar_url update via manual URL if needed, but upload-avatar overrides it.
    if user_update.avatar_url is not None:
        current_user.avatar_url = user_update.avatar_url
    
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
    
    return {
        "user": UserResponse.model_validate(current_user),
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
