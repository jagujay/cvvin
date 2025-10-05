# Local Storage Implementation Guide

## Phase 1: Database Setup and Configuration (Week 1)

### Step 1.1: PostgreSQL Configuration

#### 1.1.1 Install PostgreSQL
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# macOS with Homebrew
brew install postgresql
brew services start postgresql

# Windows
# Download from https://www.postgresql.org/download/windows/
```

#### 1.1.2 Configure PostgreSQL for BYTEA
```sql
-- Connect to PostgreSQL
psql -U postgres

-- Create database
CREATE DATABASE cvvin;

-- Create user
CREATE USER cvvin_user WITH PASSWORD 'secure_password';

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE cvvin TO cvvin_user;

-- Configure BYTEA settings
ALTER SYSTEM SET max_prepared_transactions = 0;
ALTER SYSTEM SET shared_preload_libraries = '';

-- Restart PostgreSQL
sudo systemctl restart postgresql
```

#### 1.1.3 Create Database Schema
```sql
-- Connect to cvvin database
\c cvvin

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firebase_uid VARCHAR(128) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    profile_image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    preferences JSONB DEFAULT '{}'::jsonb
);

-- Create files table with local storage support
CREATE TABLE files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size BIGINT NOT NULL,
    file_data BYTEA,              -- For small files in database
    file_path TEXT,              -- For large files on filesystem
    storage_method VARCHAR(20) DEFAULT 'database',
    mime_type VARCHAR(100),
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_processed BOOLEAN DEFAULT false,
    processing_status VARCHAR(50) DEFAULT 'pending',
    checksum VARCHAR(64)         -- SHA-256 hash
);

-- Create indexes
CREATE INDEX idx_files_user_id ON files(user_id);
CREATE INDEX idx_files_storage_method ON files(storage_method);
CREATE INDEX idx_files_file_type ON files(file_type);
CREATE INDEX idx_files_checksum ON files(checksum);
```

### Step 1.2: Python Environment Setup

#### 1.2.1 Create Virtual Environment
```bash
# Create project directory
mkdir cvvin-analysis-service
cd cvvin-analysis-service

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows
venv\Scripts\activate
# Linux/macOS
source venv/bin/activate

# Install dependencies
pip install fastapi uvicorn sqlalchemy psycopg2-binary python-multipart
pip install fitz PyMuPDF cryptography python-jose[cryptography]
pip install ollama tenacity python-dotenv
```

#### 1.2.2 Project Structure Setup
```bash
mkdir -p app/{api/v1,core,models,schemas,services,utils,workers}
mkdir -p tests/{test_api,test_services,test_utils}
mkdir uploads/{users,temp,backups}
touch app/__init__.py app/api/__init__.py app/api/v1/__init__.py
touch app/core/__init__.py app/models/__init__.py app/schemas/__init__.py
touch app/services/__init__.py app/utils/__init__.py app/workers/__init__.py
```

### Step 1.3: Configuration Files

#### 1.3.1 Environment Configuration (.env)
```bash
# Database
DATABASE_URL=postgresql://cvvin_user:secure_password@localhost:5432/cvvin

# File Storage
UPLOAD_DIR=/path/to/cvvin-analysis-service/uploads
MAX_DB_FILE_SIZE=10485760  # 10MB
MAX_FILE_SIZE=52428800     # 50MB

# Ollama
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=resume-analyzer

# Security
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Logging
LOG_LEVEL=INFO
LOG_FORMAT=json
```

#### 1.3.2 Configuration Module (app/core/config.py)
```python
from pydantic_settings import BaseSettings
from typing import Optional
import os

class Settings(BaseSettings):
    # Database
    database_url: str
    
    # File Storage
    upload_dir: str = "uploads"
    max_db_file_size: int = 10485760  # 10MB
    max_file_size: int = 52428800     # 50MB
    
    # Ollama
    ollama_host: str = "http://localhost:11434"
    ollama_model: str = "resume-analyzer"
    
    # Security
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    # Logging
    log_level: str = "INFO"
    log_format: str = "json"
    
    class Config:
        env_file = ".env"

settings = Settings()
```

## Phase 2: Core Service Implementation (Week 2)

### Step 2.1: Database Models

#### 2.1.1 User Model (app/models/user.py)
```python
from sqlalchemy import Column, String, DateTime, Boolean, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
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
```

#### 2.1.2 File Model (app/models/file.py)
```python
from sqlalchemy import Column, String, DateTime, Boolean, BigInteger, Text
from sqlalchemy.dialects.postgresql import UUID, BYTEA
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
from sqlalchemy import ForeignKey
import uuid

Base = declarative_base()

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
```

### Step 2.2: Database Connection

#### 2.2.1 Database Module (app/core/database.py)
```python
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# Create database engine
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_recycle=300,
    echo=False  # Set to True for SQL debugging
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()

def get_db():
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_tables():
    """Create all database tables"""
    Base.metadata.create_all(bind=engine)
```

### Step 2.3: File Service Implementation

#### 2.3.1 Local File Service (app/services/file_service.py)
```python
import os
import uuid
import hashlib
import fitz
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.logging import logger
from app.core.exceptions import FileProcessingError
from app.models.file import File

class LocalFileService:
    def __init__(self, db: Session):
        self.db = db
        self.upload_dir = settings.upload_dir
        self.max_db_size = settings.max_db_file_size
        self.max_file_size = settings.max_file_size
        
        # Ensure upload directory exists
        os.makedirs(self.upload_dir, exist_ok=True)
        os.makedirs(os.path.join(self.upload_dir, 'users'), exist_ok=True)
        os.makedirs(os.path.join(self.upload_dir, 'temp'), exist_ok=True)
        os.makedirs(os.path.join(self.upload_dir, 'backups'), exist_ok=True)
    
    async def upload_file(
        self, 
        file_content: bytes, 
        file_name: str, 
        content_type: str,
        user_id: str
    ) -> Dict[str, Any]:
        """Upload file locally and return metadata"""
        try:
            # Validate file
            if not self._validate_file(file_content, file_name):
                raise FileProcessingError("Invalid file type or size")
            
            file_size = len(file_content)
            file_hash = hashlib.sha256(file_content).hexdigest()
            
            # Check for duplicate files
            existing_file = self.db.query(File).filter(
                File.checksum == file_hash,
                File.user_id == user_id
            ).first()
            
            if existing_file:
                logger.info(f"Duplicate file found: {file_name}")
                return {
                    'file_id': str(existing_file.id),
                    'file_name': file_name,
                    'content_type': content_type,
                    'size': file_size,
                    'storage_method': existing_file.storage_method,
                    'checksum': file_hash,
                    'is_duplicate': True
                }
            
            # Choose storage method based on file size
            if file_size <= self.max_db_size:
                file_record = await self._store_in_database(
                    file_content, file_name, content_type, user_id, file_hash
                )
                storage_method = 'database'
            else:
                file_record = await self._store_on_filesystem(
                    file_content, file_name, content_type, user_id, file_hash
                )
                storage_method = 'filesystem'
            
            return {
                'file_id': str(file_record.id),
                'file_name': file_name,
                'content_type': content_type,
                'size': file_size,
                'storage_method': storage_method,
                'checksum': file_hash,
                'is_duplicate': False
            }
            
        except Exception as e:
            logger.error(f"File upload failed: {e}")
            raise FileProcessingError(f"Upload failed: {str(e)}")
    
    def _validate_file(self, file_content: bytes, file_name: str) -> bool:
        """Validate file type and size"""
        # Check file size
        if len(file_content) > self.max_file_size:
            logger.warning(f"File too large: {len(file_content)} bytes")
            return False
        
        # Check file extension
        allowed_extensions = ['.pdf', '.png', '.jpg', '.jpeg']
        if not any(file_name.lower().endswith(ext) for ext in allowed_extensions):
            logger.warning(f"Invalid file extension: {file_name}")
            return False
        
        # Check file signature
        if not self._validate_file_signature(file_content):
            logger.warning(f"Invalid file signature: {file_name}")
            return False
        
        return True
    
    def _validate_file_signature(self, file_content: bytes) -> bool:
        """Validate file signature (magic bytes)"""
        # PDF signature
        if file_content.startswith(b'%PDF'):
            return True
        
        # PNG signature
        if file_content.startswith(b'\x89PNG\r\n\x1a\n'):
            return True
        
        # JPEG signature
        if file_content.startswith(b'\xff\xd8\xff'):
            return True
        
        return False
    
    async def _store_in_database(
        self, 
        file_content: bytes, 
        file_name: str, 
        content_type: str,
        user_id: str,
        file_hash: str
    ) -> File:
        """Store file in PostgreSQL BYTEA"""
        file_record = File(
            user_id=user_id,
            file_name=file_name,
            file_data=file_content,
            file_size=len(file_content),
            storage_method='database',
            mime_type=content_type,
            checksum=file_hash
        )
        
        self.db.add(file_record)
        self.db.commit()
        self.db.refresh(file_record)
        
        logger.info(f"File stored in database: {file_name} ({len(file_content)} bytes)")
        return file_record
    
    async def _store_on_filesystem(
        self, 
        file_content: bytes, 
        file_name: str, 
        content_type: str,
        user_id: str,
        file_hash: str
    ) -> File:
        """Store file on local filesystem"""
        # Create user directory
        user_dir = os.path.join(self.upload_dir, 'users', user_id)
        os.makedirs(user_dir, exist_ok=True)
        
        # Generate unique filename
        file_id = str(uuid.uuid4())
        safe_filename = self._sanitize_filename(file_name)
        file_path = os.path.join(user_dir, f"{file_id}_{safe_filename}")
        
        # Write file
        with open(file_path, 'wb') as f:
            f.write(file_content)
        
        # Store metadata in database
        file_record = File(
            user_id=user_id,
            file_name=file_name,
            file_path=file_path,
            file_size=len(file_content),
            storage_method='filesystem',
            mime_type=content_type,
            checksum=file_hash
        )
        
        self.db.add(file_record)
        self.db.commit()
        self.db.refresh(file_record)
        
        logger.info(f"File stored on filesystem: {file_name} ({len(file_content)} bytes)")
        return file_record
    
    def _sanitize_filename(self, filename: str) -> str:
        """Sanitize filename for filesystem storage"""
        import re
        # Remove or replace invalid characters
        filename = re.sub(r'[<>:"/\\|?*]', '_', filename)
        # Limit length
        if len(filename) > 255:
            name, ext = os.path.splitext(filename)
            filename = name[:255-len(ext)] + ext
        return filename
    
    async def extract_text_from_pdf(self, file_id: str) -> Optional[str]:
        """Extract text from PDF stored locally"""
        try:
            # Get file record from database
            file_record = self.db.query(File).filter(File.id == file_id).first()
            if not file_record:
                raise FileProcessingError("File not found")
            
            if file_record.storage_method == 'database':
                # Extract from database BYTEA
                pdf_content = file_record.file_data
            else:
                # Read from filesystem
                if not os.path.exists(file_record.file_path):
                    raise FileProcessingError("File not found on filesystem")
                
                with open(file_record.file_path, 'rb') as f:
                    pdf_content = f.read()
            
            # Extract text using PyMuPDF
            doc = fitz.open(stream=pdf_content, filetype="pdf")
            text = ""
            
            for page in doc:
                text += page.get_text()
            
            doc.close()
            
            logger.info(f"Text extracted from PDF: {file_record.file_name}")
            return text.strip()
            
        except Exception as e:
            logger.error(f"PDF text extraction failed: {e}")
            raise FileProcessingError(f"Text extraction failed: {str(e)}")
    
    def get_file(self, file_id: str) -> Optional[File]:
        """Get file record by ID"""
        return self.db.query(File).filter(File.id == file_id).first()
    
    def delete_file(self, file_id: str) -> bool:
        """Delete file and its storage"""
        try:
            file_record = self.db.query(File).filter(File.id == file_id).first()
            if not file_record:
                return False
            
            # Delete from filesystem if applicable
            if file_record.storage_method == 'filesystem' and file_record.file_path:
                if os.path.exists(file_record.file_path):
                    os.remove(file_record.file_path)
            
            # Delete from database
            self.db.delete(file_record)
            self.db.commit()
            
            logger.info(f"File deleted: {file_record.file_name}")
            return True
            
        except Exception as e:
            logger.error(f"File deletion failed: {e}")
            self.db.rollback()
            return False
```

## Phase 3: API Implementation (Week 3)

### Step 3.1: FastAPI Application Setup

#### 3.1.1 Main Application (app/main.py)
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import create_tables
from app.core.logging import setup_logging
from app.api.v1 import analysis, files, health

# Setup logging
setup_logging()

# Create FastAPI app
app = FastAPI(
    title="CVVIN Analysis Service",
    description="LLM-powered resume analysis and interview preparation",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, prefix="/health", tags=["health"])
app.include_router(analysis.router, prefix="/api/v1/analysis", tags=["analysis"])
app.include_router(files.router, prefix="/api/v1/files", tags=["files"])

@app.on_event("startup")
async def startup_event():
    """Initialize application on startup"""
    create_tables()
    logger.info("CVVIN Analysis Service started")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("CVVIN Analysis Service stopped")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
```

#### 3.1.2 Logging Setup (app/core/logging.py)
```python
import logging
import sys
from pythonjsonlogger import jsonlogger

def setup_logging():
    """Configure structured logging"""
    logHandler = logging.StreamHandler(sys.stdout)
    formatter = jsonlogger.JsonFormatter(
        fmt='%(asctime)s %(name)s %(levelname)s %(message)s'
    )
    logHandler.setFormatter(formatter)
    
    logger = logging.getLogger()
    logger.addHandler(logHandler)
    logger.setLevel(logging.INFO)
    
    return logger

logger = setup_logging()
```

### Step 3.2: API Endpoints

#### 3.2.1 File Upload Endpoint (app/api/v1/files.py)
```python
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.services.file_service import LocalFileService
from app.models.user import User
from app.schemas.file import FileUploadResponse, FileInfo
import os

router = APIRouter()

@router.post("/upload", response_model=FileUploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload file for analysis"""
    try:
        # Validate file type
        if not file.filename.endswith('.pdf'):
            raise HTTPException(
                status_code=400, 
                detail="Only PDF files are supported"
            )
        
        # Read file content
        file_content = await file.read()
        
        # Initialize file service
        file_service = LocalFileService(db)
        
        # Upload file
        upload_result = await file_service.upload_file(
            file_content=file_content,
            file_name=file.filename,
            content_type=file.content_type,
            user_id=str(current_user.id)
        )
        
        return FileUploadResponse(**upload_result)
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Upload failed: {str(e)}"
        )

@router.get("/{file_id}/download")
async def download_file(
    file_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Download file"""
    try:
        file_service = LocalFileService(db)
        file_record = file_service.get_file(file_id)
        
        if not file_record:
            raise HTTPException(status_code=404, detail="File not found")
        
        # Check user ownership
        if str(file_record.user_id) != str(current_user.id):
            raise HTTPException(status_code=403, detail="Access denied")
        
        if file_record.storage_method == 'database':
            # Serve from database
            return Response(
                content=file_record.file_data,
                media_type=file_record.mime_type,
                headers={"Content-Disposition": f"attachment; filename={file_record.file_name}"}
            )
        else:
            # Serve from filesystem
            if not os.path.exists(file_record.file_path):
                raise HTTPException(status_code=404, detail="File not found on disk")
            
            return FileResponse(
                path=file_record.file_path,
                filename=file_record.file_name,
                media_type=file_record.mime_type
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Download failed: {str(e)}"
        )

@router.get("/{file_id}/info", response_model=FileInfo)
async def get_file_info(
    file_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get file information"""
    try:
        file_service = LocalFileService(db)
        file_record = file_service.get_file(file_id)
        
        if not file_record:
            raise HTTPException(status_code=404, detail="File not found")
        
        # Check user ownership
        if str(file_record.user_id) != str(current_user.id):
            raise HTTPException(status_code=403, detail="Access denied")
        
        return FileInfo(
            id=str(file_record.id),
            file_name=file_record.file_name,
            file_type=file_record.file_type,
            file_size=file_record.file_size,
            storage_method=file_record.storage_method,
            mime_type=file_record.mime_type,
            upload_date=file_record.upload_date,
            checksum=file_record.checksum
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get file info: {str(e)}"
        )

@router.delete("/{file_id}")
async def delete_file(
    file_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete file"""
    try:
        file_service = LocalFileService(db)
        file_record = file_service.get_file(file_id)
        
        if not file_record:
            raise HTTPException(status_code=404, detail="File not found")
        
        # Check user ownership
        if str(file_record.user_id) != str(current_user.id):
            raise HTTPException(status_code=403, detail="Access denied")
        
        success = file_service.delete_file(file_id)
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to delete file")
        
        return {"message": "File deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Delete failed: {str(e)}"
        )
```

This implementation provides a complete foundation for local file storage. The next phases would cover:

- **Phase 4**: Ollama integration and resume analysis
- **Phase 5**: Frontend integration
- **Phase 6**: Testing and deployment

Would you like me to continue with the remaining phases?


