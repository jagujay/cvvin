# Backend Architecture Plan for CVVIN Platform

## Overview

This document outlines the proposed Python-based backend architecture for the CVVIN platform, designed to integrate seamlessly with the existing Node.js authentication system while providing robust LLM-powered resume analysis capabilities.

## Architecture Principles

### 1. Microservices Approach
- **Authentication Service**: Existing Node.js/Express (maintained)
- **Analysis Service**: New Python-based service for LLM operations
- **File Service**: Python service for document processing
- **API Gateway**: Unified entry point for all services

### 2. Technology Stack
- **Language**: Python 3.11+
- **Framework**: FastAPI (high-performance, async support)
- **Database**: PostgreSQL with SQLAlchemy ORM
- **LLM Integration**: Ollama with custom models
- **File Storage**: AWS S3 with boto3
- **Message Queue**: Redis for async processing
- **Monitoring**: Prometheus + Grafana

## Service Architecture

### 1. API Gateway Service
```
┌─────────────────┐
│   API Gateway   │ ← Frontend requests
│   (FastAPI)     │
└─────────────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌─────────┐ ┌─────────┐
│ Auth    │ │Analysis │
│ Service │ │ Service │
│(Node.js)│ │(Python) │
└─────────┘ └─────────┘
```

### 2. Analysis Service Components

#### Core Modules
```
analysis_service/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application
│   ├── config.py            # Configuration management
│   ├── dependencies.py      # Dependency injection
│   └── middleware.py        # Custom middleware
├── api/
│   ├── __init__.py
│   ├── v1/
│   │   ├── __init__.py
│   │   ├── analysis.py      # Resume analysis endpoints
│   │   ├── files.py         # File management endpoints
│   │   └── health.py        # Health check endpoints
├── core/
│   ├── __init__.py
│   ├── database.py          # Database connection
│   ├── security.py          # Authentication/authorization
│   ├── exceptions.py        # Custom exceptions
│   └── logging.py           # Logging configuration
├── models/
│   ├── __init__.py
│   ├── user.py              # User models
│   ├── analysis.py          # Analysis models
│   ├── session.py           # Session models
│   └── file.py              # File models
├── services/
│   ├── __init__.py
│   ├── ollama_service.py     # LLM integration
│   ├── file_service.py      # File processing
│   ├── analysis_service.py  # Business logic
│   └── notification_service.py
├── utils/
│   ├── __init__.py
│   ├── pdf_extractor.py     # PDF text extraction
│   ├── text_processor.py    # Text preprocessing
│   ├── validators.py        # Input validation
│   └── helpers.py           # Utility functions
├── workers/
│   ├── __init__.py
│   ├── analysis_worker.py   # Background processing
│   └── file_worker.py       # File processing worker
└── tests/
    ├── __init__.py
    ├── test_api/
    ├── test_services/
    └── test_utils/
```

## Detailed Service Implementation

### 1. FastAPI Application Structure

#### main.py
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api.v1 import analysis, files, health
from app.core.database import create_tables
from app.core.logging import setup_logging

app = FastAPI(
    title="CVVIN Analysis Service",
    description="LLM-powered resume analysis and interview preparation",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
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
    setup_logging()
    await create_tables()
```

### 2. Ollama Integration Service

#### ollama_service.py
```python
import ollama
import json
from typing import Dict, Any, Optional
from app.core.logging import logger
from app.core.exceptions import AnalysisError

class OllamaService:
    def __init__(self, model_name: str = "resume-analyzer"):
        self.client = ollama.Client()
        self.model_name = model_name
    
    async def analyze_resume(
        self, 
        resume_text: str, 
        job_description: str
    ) -> Dict[str, Any]:
        """
        Analyze resume against job description using Ollama model
        """
        try:
            prompt = f"""
            --- RESUME ---
            {resume_text}
            --- JOB DESCRIPTION ---
            {job_description}
            """
            
            response = self.client.generate(
                model=self.model_name,
                prompt=prompt,
                options={
                    "temperature": 0.2,
                    "top_p": 0.9,
                    "max_tokens": 4000
                }
            )
            
            # Parse JSON response
            analysis_result = json.loads(response['response'])
            
            # Validate response structure
            self._validate_analysis_result(analysis_result)
            
            return analysis_result
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Ollama response: {e}")
            raise AnalysisError("Invalid analysis response format")
        except Exception as e:
            logger.error(f"Ollama analysis failed: {e}")
            raise AnalysisError(f"Analysis failed: {str(e)}")
    
    def _validate_analysis_result(self, result: Dict[str, Any]) -> None:
        """Validate the structure of analysis result"""
        required_fields = [
            "overallScore", "summary", "skillAnalysis", 
            "experienceAnalysis", "strengths", "gaps", 
            "suggestions", "atsCompliance"
        ]
        
        for field in required_fields:
            if field not in result:
                raise AnalysisError(f"Missing required field: {field}")
```

### 3. File Processing Service

#### file_service.py
```python
import os
import uuid
import hashlib
import fitz  # PyMuPDF
from typing import Optional, Dict, Any
from app.core.config import settings
from app.core.logging import logger
from app.core.exceptions import FileProcessingError
from app.models.file import File

class LocalFileService:
    def __init__(self, db_session):
        self.db = db_session
        self.upload_dir = settings.UPLOAD_DIR
        self.max_db_size = settings.MAX_DB_FILE_SIZE  # 10MB
        self.max_file_size = settings.MAX_FILE_SIZE  # 50MB
    
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
            
            # Choose storage method based on file size
            if file_size <= self.max_db_size:
                # Store in database
                file_record = await self._store_in_database(
                    file_content, file_name, content_type, user_id, file_hash
                )
                storage_method = 'database'
            else:
                # Store on filesystem
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
                'checksum': file_hash
            }
            
        except Exception as e:
            logger.error(f"File upload failed: {e}")
            raise FileProcessingError(f"Upload failed: {str(e)}")
    
    def _validate_file(self, file_content: bytes, file_name: str) -> bool:
        """Validate file type and size"""
        # Check file size
        if len(file_content) > self.max_file_size:
            return False
        
        # Check file extension
        allowed_extensions = ['.pdf', '.png', '.jpg', '.jpeg']
        if not any(file_name.lower().endswith(ext) for ext in allowed_extensions):
            return False
        
        # Check file signature
        return self._validate_file_signature(file_content)
    
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
        file_path = os.path.join(user_dir, f"{file_id}_{file_name}")
        
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
        return file_record
    
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
            return text.strip()
            
        except Exception as e:
            logger.error(f"PDF text extraction failed: {e}")
            raise FileProcessingError(f"Text extraction failed: {str(e)}")
    
    def get_file_url(self, file_id: str, expiration: int = 3600) -> str:
        """Generate URL for file access"""
        try:
            file_record = self.db.query(File).filter(File.id == file_id).first()
            if not file_record:
                raise FileProcessingError("File not found")
            
            if file_record.storage_method == 'database':
                # For database files, serve directly through API
                return f"/api/v1/files/{file_id}/download"
            else:
                # For filesystem files, return direct path (with proper access control)
                return f"/api/v1/files/{file_id}/download"
                
        except Exception as e:
            logger.error(f"File URL generation failed: {e}")
            raise FileProcessingError(f"URL generation failed: {str(e)}")
```

### 4. Analysis API Endpoints

#### analysis.py
```python
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.services.analysis_service import AnalysisService
from app.services.file_service import FileService
from app.models.user import User
from app.schemas.analysis import AnalysisRequest, AnalysisResponse

router = APIRouter()

@router.post("/resume", response_model=AnalysisResponse)
async def analyze_resume(
    job_description: str,
    resume_file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Analyze uploaded resume against job description
    """
    try:
        # Validate file type
        if not resume_file.filename.endswith('.pdf'):
            raise HTTPException(
                status_code=400, 
                detail="Only PDF files are supported"
            )
        
        # Read file content
        file_content = await resume_file.read()
        
        # Initialize services
        file_service = LocalFileService(db)
        analysis_service = AnalysisService()
        
        # Upload file locally
        upload_result = await file_service.upload_file(
            file_content=file_content,
            file_name=resume_file.filename,
            content_type=resume_file.content_type,
            user_id=str(current_user.id)
        )
        
        # Extract text from PDF
        resume_text = await file_service.extract_text_from_pdf(
            upload_result['file_id']
        )
        
        if not resume_text:
            raise HTTPException(
                status_code=400,
                detail="Could not extract text from PDF"
            )
        
        # Perform analysis
        analysis_result = await analysis_service.analyze_resume(
            resume_text=resume_text,
            job_description=job_description,
            user_id=str(current_user.id),
            db=db
        )
        
        return analysis_result
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Analysis failed: {str(e)}"
        )

@router.get("/history")
async def get_analysis_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get user's analysis history
    """
    analysis_service = AnalysisService()
    return await analysis_service.get_user_analysis_history(
        user_id=str(current_user.id),
        db=db
    )
```

## Integration with Existing System

### 1. Authentication Integration

#### security.py
```python
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.config import settings
from app.core.database import get_db
from app.models.user import User

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Validate Firebase JWT token and return user
    """
    try:
        # Verify Firebase JWT token
        token = credentials.credentials
        
        # Use Firebase Admin SDK to verify token
        decoded_token = firebase_admin.auth.verify_id_token(token)
        firebase_uid = decoded_token['uid']
        
        # Get user from database
        user = db.query(User).filter(
            User.firebase_uid == firebase_uid
        ).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return user
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )
```

### 2. Database Integration

#### database.py
```python
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# Database engine
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=300,
    echo=settings.DEBUG
)

# Session factory
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

async def create_tables():
    """Create database tables"""
    Base.metadata.create_all(bind=engine)
```

## Deployment Architecture

### 1. Container Strategy
```yaml
# docker-compose.yml
version: '3.8'
services:
  api-gateway:
    build: ./api-gateway
    ports:
      - "8000:8000"
    environment:
      - AUTH_SERVICE_URL=http://auth-service:3001
      - ANALYSIS_SERVICE_URL=http://analysis-service:8001
    depends_on:
      - auth-service
      - analysis-service

  auth-service:
    build: ./backend
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:pass@postgres:5432/cvvin

  analysis-service:
    build: ./analysis-service
    ports:
      - "8001:8001"
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/cvvin
      - OLLAMA_HOST=http://ollama:11434
      - UPLOAD_DIR=/app/uploads
      - MAX_DB_FILE_SIZE=10485760  # 10MB
      - MAX_FILE_SIZE=52428800     # 50MB
    volumes:
      - uploads_data:/app/uploads
    depends_on:
      - postgres
      - redis
      - ollama

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=cvvin
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  ollama:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama

volumes:
  postgres_data:
  ollama_data:
  uploads_data:
```

### 2. Production Deployment

#### Kubernetes Configuration
```yaml
# k8s/analysis-service-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: analysis-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: analysis-service
  template:
    metadata:
      labels:
        app: analysis-service
    spec:
      containers:
      - name: analysis-service
        image: cvvin/analysis-service:latest
        ports:
        - containerPort: 8001
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: cvvin-secrets
              key: database-url
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 8001
          initialDelaySeconds: 5
          periodSeconds: 5
```

## Monitoring and Observability

### 1. Logging Strategy
```python
# logging.py
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
```

### 2. Metrics Collection
```python
# metrics.py
from prometheus_client import Counter, Histogram, generate_latest
from fastapi import Response

# Define metrics
REQUEST_COUNT = Counter(
    'http_requests_total', 
    'Total HTTP requests',
    ['method', 'endpoint', 'status']
)

REQUEST_DURATION = Histogram(
    'http_request_duration_seconds',
    'HTTP request duration',
    ['method', 'endpoint']
)

ANALYSIS_COUNT = Counter(
    'resume_analyses_total',
    'Total resume analyses performed',
    ['status']
)

ANALYSIS_DURATION = Histogram(
    'resume_analysis_duration_seconds',
    'Resume analysis duration'
)
```

## Performance Optimization

### 1. Caching Strategy
- **Redis**: Session data, analysis results
- **Application Cache**: Frequently accessed user data
- **CDN**: Static assets, processed files

### 2. Async Processing
- **Background Tasks**: File processing, analysis queue
- **WebSocket**: Real-time analysis progress
- **Message Queue**: Decouple heavy operations

### 3. Database Optimization
- **Connection Pooling**: SQLAlchemy connection pool
- **Query Optimization**: Indexed queries, query analysis
- **Read Replicas**: Separate read/write operations

## Security Considerations

### 1. API Security
- **Rate Limiting**: Prevent abuse
- **Input Validation**: Sanitize all inputs
- **CORS Configuration**: Restrict origins

### 2. Data Protection
- **Encryption**: At rest and in transit
- **Access Control**: Role-based permissions
- **Audit Logging**: Track all operations

### 3. Infrastructure Security
- **Network Policies**: Kubernetes network isolation
- **Secrets Management**: Encrypted secrets
- **Regular Updates**: Security patches

## Migration Plan

### Phase 1: Foundation (Weeks 1-2)
1. Set up Python analysis service
2. Implement basic file upload/processing
3. Integrate with existing authentication

### Phase 2: Core Features (Weeks 3-4)
1. Implement Ollama integration
2. Add resume analysis endpoints
3. Database schema implementation

### Phase 3: Advanced Features (Weeks 5-6)
1. Background processing
2. Caching implementation
3. Performance optimization

### Phase 4: Production Ready (Weeks 7-8)
1. Monitoring and logging
2. Security hardening
3. Load testing and optimization

## Cost Estimation

### Development Environment
- **EC2 t3.medium**: ~$30/month
- **RDS db.t3.micro**: ~$15/month
- **Local Storage**: ~$5/month (EBS volume)
- **Total**: ~$50/month

### Production Environment
- **EKS Cluster**: ~$150/month
- **RDS db.r5.large**: ~$200/month
- **Local Storage**: ~$50/month (EBS volumes)
- **Load Balancer**: ~$20/month
- **Total**: ~$420/month

This architecture provides a scalable, maintainable foundation for the CVVIN platform while preserving existing functionality and enabling advanced LLM-powered features.
