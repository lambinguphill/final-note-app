from datetime import datetime, timedelta
from typing import List, Optional, Union, Any
import os
from dotenv import load_dotenv

from fastapi import FastAPI, Depends, HTTPException, status, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from pydantic import BaseModel, EmailStr, Field, field_validator
from passlib.context import CryptContext
from jose import JWTError, jwt

# Load environment variables
load_dotenv()

# Configuration
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://noteuser:notepass@localhost:5432/notedb")
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

# Database setup
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Password context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

# Database Models
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    notes = relationship("Note", back_populates="user", cascade="all, delete-orphan")

class Note(Base):
    __tablename__ = "notes"
    
    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)
    word_count = Column(Integer, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="notes")

# Create tables
Base.metadata.create_all(bind=engine)

# Pydantic Schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserSchema(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class NoteBase(BaseModel):
    content: str = Field(..., min_length=1)
    
    @field_validator('content')
    def validate_word_count(cls, v):
        word_count = len(v.split())
        if word_count > 50:
            raise ValueError(f'Content exceeds 50 words (current: {word_count})')
        return v

class NoteCreate(NoteBase):
    pass

class NoteSchema(NoteBase):
    id: int
    user_id: int
    word_count: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    email: Optional[str] = None

# Initialize FastAPI app
app = FastAPI(title="Note Keeper API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Utility functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
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
        token_data = TokenData(email=email)
    except JWTError:
        raise credentials_exception
    
    # Fixed SQLAlchemy query syntax
    user = db.query(User).filter(User.email == token_data.email).first()
    if user is None:
        raise credentials_exception
    return user

# Routes
@app.get("/")
def read_root():
    return {
        "name": "Note Keeper API",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}

# Authentication endpoints
@app.post("/api/v1/auth/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # Fixed SQLAlchemy query syntax
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/api/v1/auth/register", response_model=UserSchema)
def register(*, db: Session = Depends(get_db), user_in: UserCreate):
    # Check if user exists - Fixed SQLAlchemy query syntax
    user = db.query(User).filter(User.email == user_in.email).first()
    if user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )
    
    # Create new user
    hashed_password = get_password_hash(user_in.password)
    
    db_user = User(
        email=user_in.email,
        hashed_password=hashed_password,
        full_name=user_in.full_name,
        is_active=True
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # If this is the test account, add some sample notes
    if user_in.email == "test@test.com":
        sample_notes = [
            "Welcome to Note Keeper! This is your first note.",
            "You can create up to 10 notes, each with a maximum of 50 words.",
            "Click on any note to delete it. Try creating a new note!"
        ]
        for content in sample_notes:
            note = Note(
                content=content,
                word_count=len(content.split()),
                user_id=db_user.id
            )
            db.add(note)
        db.commit()
    
    return db_user

# User endpoints
@app.get("/api/v1/users/me", response_model=UserSchema)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

# Notes endpoints
@app.get("/api/v1/notes", response_model=List[NoteSchema])
def read_notes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    skip: int = 0,
    limit: int = 100
):
    # Fixed SQLAlchemy query syntax
    notes = db.query(Note).filter(Note.user_id == current_user.id).offset(skip).limit(limit).all()
    return notes

@app.post("/api/v1/notes", response_model=NoteSchema)
def create_note(
    *,
    db: Session = Depends(get_db),
    note_in: NoteCreate,
    current_user: User = Depends(get_current_user)
):
    # Check note count - Fixed SQLAlchemy query syntax
    note_count = db.query(Note).filter(Note.user_id == current_user.id).count()
    if note_count >= 10:
        raise HTTPException(
            status_code=400,
            detail="Maximum number of notes (10) reached"
        )
    
    # Create note
    word_count = len(note_in.content.split())
    db_note = Note(
        content=note_in.content,
        word_count=word_count,
        user_id=current_user.id
    )
    db.add(db_note)
    db.commit()
    db.refresh(db_note)
    return db_note

@app.delete("/api/v1/notes/{note_id}")
def delete_note(
    *,
    db: Session = Depends(get_db),
    note_id: int,
    current_user: User = Depends(get_current_user)
):
    # Fixed SQLAlchemy query syntax
    note = db.query(Note).filter(Note.id == note_id).filter(Note.user_id == current_user.id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    db.delete(note)
    db.commit()
    return {"message": "Note deleted successfully"}

if __name__ == "__main__":
    import uvicorn
    
    # Create test user on startup
    print("Creating test user...")
    db = SessionLocal()
    test_user = db.query(User).filter(User.email == "test@test.com").first()
    if not test_user:
        test_user = User(
            email="test@test.com",
            hashed_password=get_password_hash("test123"),
            full_name="Test User"
        )
        db.add(test_user)
        db.commit()
        print("Test user created: test@test.com / test123")
    else:
        print("Test user already exists")
    db.close()
    
    print("Starting server...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
