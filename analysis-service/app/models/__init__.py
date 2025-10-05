from sqlalchemy import Column, String, DateTime, Boolean, BigInteger, Text, Integer, ForeignKey, DECIMAL
from sqlalchemy.dialects.postgresql import UUID, JSONB, BYTEA
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
import uuid

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    firebase_uid = Column(String(128), unique=True, nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    first_name = Column(String(100))
    last_name = Column(String(100))
    phone = Column(String(20))
    profile_image_url = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_login = Column(DateTime(timezone=True))
    is_active = Column(Boolean, default=True)
    preferences = Column(JSONB, default={})

class UserProfile(Base):
    __tablename__ = "user_profiles"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    resume_url = Column(Text)
    resume_text = Column(Text)
    skills = Column(JSONB, default=[])
    experience_years = Column(DECIMAL(3, 1))
    education = Column(JSONB, default=[])
    certifications = Column(JSONB, default=[])
    languages = Column(JSONB, default=[])
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class File(Base):
    __tablename__ = "files"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_type = Column(String(50), nullable=False)
    file_size = Column(BigInteger, nullable=False)
    file_data = Column(BYTEA)  # For small files
    file_path = Column(Text)   # For large files
    storage_method = Column(String(20), default='database')
    mime_type = Column(String(100))
    upload_date = Column(DateTime(timezone=True), server_default=func.now())
    is_processed = Column(Boolean, default=False)
    processing_status = Column(String(50), default='pending')
    checksum = Column(String(64))  # SHA-256 hash

class ResumeAnalysis(Base):
    __tablename__ = "resume_analyses"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    file_id = Column(UUID(as_uuid=True), ForeignKey("files.id"), nullable=False)
    job_description = Column(Text, nullable=False)
    analysis_result = Column(JSONB, nullable=False)
    overall_score = Column(Integer)
    resume_text = Column(Text)
    analysis_date = Column(DateTime(timezone=True), server_default=func.now())
    model_version = Column(String(50), default='resume-analyzer-v1')

class InterviewSession(Base):
    __tablename__ = "interview_sessions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    session_type = Column(String(50), nullable=False)
    status = Column(String(20), default='active')
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True))
    total_duration = Column(Integer)
    overall_score = Column(Integer)
    feedback = Column(JSONB, default={})
    metadata = Column(JSONB, default={})

class SessionComponent(Base):
    __tablename__ = "session_components"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("interview_sessions.id"), nullable=False)
    component_type = Column(String(50), nullable=False)
    component_data = Column(JSONB, nullable=False)
    score = Column(Integer)
    completed_at = Column(DateTime(timezone=True))
    feedback = Column(JSONB, default={})


