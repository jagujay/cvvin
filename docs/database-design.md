# Database Design for CVVIN Platform

## Overview

This document outlines the recommended database architecture for the CVVIN platform, considering the requirements for user profiles, document storage, and LLM integration.

## Database Recommendation

### Primary Database: PostgreSQL

**Rationale:**
- **Structured Data**: Excellent for user profiles, session data, and relational data
- **JSON Support**: Native JSON/JSONB support for flexible schema requirements
- **Scalability**: Proven scalability for production applications
- **ACID Compliance**: Ensures data integrity for critical operations
- **Full-text Search**: Built-in capabilities for resume content search
- **Python Integration**: Excellent support with SQLAlchemy, psycopg2

### File Storage: Local Database Storage Options

**Rationale:**
- **Local Control**: Complete control over data without external dependencies
- **Cost-effective**: No ongoing cloud storage costs
- **Privacy**: Data remains on-premises
- **Simplicity**: Single database solution for all data types
- **Development**: Easy local development and testing

## Database Schema Design

### Core Tables

#### 1. Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
```

#### 2. User Profiles Table
```sql
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    resume_url TEXT,
    resume_text TEXT, -- Extracted text for search
    skills JSONB DEFAULT '[]'::jsonb,
    experience_years DECIMAL(3,1),
    education JSONB DEFAULT '[]'::jsonb,
    certifications JSONB DEFAULT '[]'::jsonb,
    languages JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 3. Resume Analysis Table
```sql
CREATE TABLE resume_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    job_description TEXT NOT NULL,
    analysis_result JSONB NOT NULL, -- Ollama analysis output
    overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
    analysis_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    model_version VARCHAR(50) DEFAULT 'resume-analyzer-v1'
);
```

#### 4. Interview Sessions Table
```sql
CREATE TABLE interview_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_type VARCHAR(50) NOT NULL, -- 'full_mock', 'technical', 'hr'
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'completed', 'abandoned'
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    total_duration INTEGER, -- in seconds
    overall_score INTEGER,
    feedback JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb
);
```

#### 5. Session Components Table
```sql
CREATE TABLE session_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES interview_sessions(id) ON DELETE CASCADE,
    component_type VARCHAR(50) NOT NULL, -- 'resume_analysis', 'mcq', 'coding', 'hr'
    component_data JSONB NOT NULL,
    score INTEGER,
    completed_at TIMESTAMP,
    feedback JSONB DEFAULT '{}'::jsonb
);
```

#### 6. Files Table
```sql
CREATE TABLE files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL, -- 'resume_pdf', 'profile_image', 'document'
    file_size BIGINT NOT NULL,
    file_data BYTEA, -- Binary data for small files (< 1MB)
    file_path TEXT, -- Path for large files stored on filesystem
    storage_method VARCHAR(20) DEFAULT 'database', -- 'database', 'filesystem', 'mongodb'
    mime_type VARCHAR(100),
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_processed BOOLEAN DEFAULT false,
    processing_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    checksum VARCHAR(64) -- SHA-256 hash for integrity verification
);
```

### Indexes for Performance

```sql
-- User lookups
CREATE INDEX idx_users_firebase_uid ON users(firebase_uid);
CREATE INDEX idx_users_email ON users(email);

-- Profile searches
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_skills ON user_profiles USING GIN(skills);

-- Resume analysis
CREATE INDEX idx_resume_analyses_user_id ON resume_analyses(user_id);
CREATE INDEX idx_resume_analyses_date ON resume_analyses(analysis_date);

-- Session management
CREATE INDEX idx_interview_sessions_user_id ON interview_sessions(user_id);
CREATE INDEX idx_interview_sessions_status ON interview_sessions(status);
CREATE INDEX idx_interview_sessions_started_at ON interview_sessions(started_at);

-- File management
CREATE INDEX idx_files_user_id ON files(user_id);
CREATE INDEX idx_files_type ON files(file_type);
CREATE INDEX idx_files_processing_status ON files(processing_status);
```

## Data Flow Architecture

### 1. User Registration Flow
```
Firebase Auth → User Creation → Profile Setup → File Upload → Text Extraction
```

### 2. Resume Analysis Flow
```
PDF Upload → S3 Storage → Text Extraction → Ollama Analysis → Database Storage
```

### 3. Interview Session Flow
```
Session Creation → Component Execution → Score Calculation → Feedback Generation
```

## Security Considerations

### 1. Data Encryption
- **At Rest**: PostgreSQL TDE (Transparent Data Encryption)
- **In Transit**: TLS 1.3 for all connections
- **Application Level**: Encrypt sensitive fields (PII) before storage

### 2. Access Control
- **Row Level Security**: Implement RLS policies for user data isolation
- **API Authentication**: Firebase JWT validation
- **File Access**: Pre-signed URLs with expiration

### 3. Data Privacy
- **GDPR Compliance**: User data deletion capabilities
- **Data Retention**: Configurable retention policies
- **Audit Logging**: Track all data access and modifications

## Scalability Considerations

### 1. Horizontal Scaling
- **Read Replicas**: For analytics and reporting queries
- **Connection Pooling**: PgBouncer for connection management
- **Caching**: Redis for session data and frequently accessed data

### 2. Performance Optimization
- **Query Optimization**: Regular query analysis and indexing
- **Partitioning**: Partition large tables by date/user
- **Archival**: Move old data to cold storage

### 3. Monitoring
- **Database Metrics**: Query performance, connection counts
- **Application Metrics**: Response times, error rates
- **Business Metrics**: User engagement, analysis accuracy

## Migration Strategy

### Phase 1: Core Tables
1. Users and User Profiles
2. Basic file management
3. Authentication integration

### Phase 2: Analysis Features
1. Resume analysis tables
2. Ollama integration
3. File processing pipeline

### Phase 3: Interview System
1. Session management
2. Component tracking
3. Feedback system

### Phase 4: Optimization
1. Performance tuning
2. Caching implementation
3. Monitoring setup

## Backup and Recovery

### 1. Backup Strategy
- **Daily Full Backups**: Automated PostgreSQL dumps
- **Continuous WAL Archiving**: Point-in-time recovery
- **S3 Cross-Region Replication**: File redundancy

### 2. Disaster Recovery
- **RTO**: 4 hours (Recovery Time Objective)
- **RPO**: 1 hour (Recovery Point Objective)
- **Testing**: Monthly DR drills

## Cost Estimation

### Database Costs (AWS RDS PostgreSQL)
- **Development**: db.t3.micro (~$15/month)
- **Production**: db.r5.large (~$200/month)
- **Storage**: 100GB GP2 (~$10/month)

### Local Storage Options

#### Option 1: PostgreSQL BYTEA (Recommended for Small Files)
- **Pros**: Integrated with main database, ACID compliance, easy backup
- **Cons**: Limited to ~1GB per file, impacts database performance
- **Best For**: Profile images, small documents (< 1MB)

#### Option 2: Hybrid Approach (Database + Filesystem)
- **Small Files**: Store in PostgreSQL BYTEA
- **Large Files**: Store on local filesystem with database metadata
- **Pros**: Best of both worlds, scalable
- **Cons**: Requires filesystem management

#### Option 3: MongoDB GridFS (Alternative)
- **Pros**: Designed for large files, good performance
- **Cons**: Additional database system, complexity
- **Best For**: Large PDFs, multiple file types

### Total Estimated Monthly Cost
- **Development**: ~$20/month (PostgreSQL only)
- **Production**: ~$100/month (PostgreSQL + local storage)

## Local File Storage Implementation

### 1. PostgreSQL BYTEA Implementation

#### File Size Limits
- **PostgreSQL BYTEA**: Up to 1GB per field
- **Practical Limit**: 10-50MB for optimal performance
- **Recommendation**: Use for profile images and small documents

#### Implementation Example
```python
# File upload service
class LocalFileService:
    def __init__(self, db_session):
        self.db = db_session
        self.max_db_size = 10 * 1024 * 1024  # 10MB
    
    async def store_file(self, file_data: bytes, file_name: str, user_id: str):
        file_size = len(file_data)
        
        if file_size <= self.max_db_size:
            # Store in database
            return await self._store_in_database(file_data, file_name, user_id)
        else:
            # Store on filesystem
            return await self._store_on_filesystem(file_data, file_name, user_id)
    
    async def _store_in_database(self, file_data: bytes, file_name: str, user_id: str):
        file_record = File(
            user_id=user_id,
            file_name=file_name,
            file_data=file_data,
            file_size=len(file_data),
            storage_method='database'
        )
        self.db.add(file_record)
        self.db.commit()
        return file_record.id
    
    async def _store_on_filesystem(self, file_data: bytes, file_name: str, user_id: str):
        # Create user directory
        user_dir = f"uploads/{user_id}"
        os.makedirs(user_dir, exist_ok=True)
        
        # Generate unique filename
        file_id = str(uuid.uuid4())
        file_path = f"{user_dir}/{file_id}_{file_name}"
        
        # Write file
        with open(file_path, 'wb') as f:
            f.write(file_data)
        
        # Store metadata in database
        file_record = File(
            user_id=user_id,
            file_name=file_name,
            file_path=file_path,
            file_size=len(file_data),
            storage_method='filesystem'
        )
        self.db.add(file_record)
        self.db.commit()
        return file_record.id
```

### 2. Hybrid Storage Strategy

#### File Size Thresholds
- **Profile Images**: < 2MB → PostgreSQL BYTEA
- **Small Documents**: < 5MB → PostgreSQL BYTEA  
- **Resume PDFs**: > 5MB → Filesystem storage
- **Large Documents**: > 10MB → Filesystem storage

#### Directory Structure
```
uploads/
├── users/
│   ├── {user_id}/
│   │   ├── profile_images/
│   │   ├── resumes/
│   │   └── documents/
├── temp/
└── backups/
```

### 3. MongoDB GridFS Alternative

#### When to Consider MongoDB
- **Large Files**: Frequent handling of files > 50MB
- **File Versioning**: Need file version management
- **Metadata**: Complex file metadata requirements
- **Performance**: High file I/O requirements

#### MongoDB Setup
```javascript
// MongoDB GridFS configuration
const { GridFSBucket } = require('mongodb');

const bucket = new GridFSBucket(db, {
    bucketName: 'files'
});

// File upload
const uploadStream = bucket.openUploadStream(filename, {
    metadata: {
        userId: userId,
        fileType: fileType,
        uploadDate: new Date()
    }
});
```

### 4. Local Storage Security

#### File Access Control
```python
class FileAccessControl:
    def __init__(self):
        self.allowed_extensions = ['.pdf', '.png', '.jpg', '.jpeg']
        self.max_file_size = 50 * 1024 * 1024  # 50MB
    
    def validate_file(self, file_data: bytes, filename: str) -> bool:
        # Check file extension
        if not any(filename.lower().endswith(ext) for ext in self.allowed_extensions):
            return False
        
        # Check file size
        if len(file_data) > self.max_file_size:
            return False
        
        # Check file signature (magic bytes)
        if not self._validate_file_signature(file_data):
            return False
        
        return True
    
    def _validate_file_signature(self, file_data: bytes) -> bool:
        # PDF signature
        if file_data.startswith(b'%PDF'):
            return True
        
        # PNG signature
        if file_data.startswith(b'\x89PNG\r\n\x1a\n'):
            return True
        
        # JPEG signature
        if file_data.startswith(b'\xff\xd8\xff'):
            return True
        
        return False
```

#### File Encryption
```python
from cryptography.fernet import Fernet

class FileEncryption:
    def __init__(self, key: bytes):
        self.cipher = Fernet(key)
    
    def encrypt_file(self, file_data: bytes) -> bytes:
        return self.cipher.encrypt(file_data)
    
    def decrypt_file(self, encrypted_data: bytes) -> bytes:
        return self.cipher.decrypt(encrypted_data)
```

### 5. Backup and Recovery

#### Database Backup
```bash
# PostgreSQL backup including BYTEA data
pg_dump -h localhost -U cvvin -d cvvin --format=custom --compress=9 > backup.dump

# Restore
pg_restore -h localhost -U cvvin -d cvvin backup.dump
```

#### Filesystem Backup
```bash
# Backup uploads directory
tar -czf uploads_backup.tar.gz uploads/

# Restore
tar -xzf uploads_backup.tar.gz
```

#### Automated Backup Script
```python
import os
import subprocess
from datetime import datetime

class BackupService:
    def __init__(self, db_config, backup_dir):
        self.db_config = db_config
        self.backup_dir = backup_dir
    
    def create_backup(self):
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Database backup
        db_backup = f"{self.backup_dir}/db_backup_{timestamp}.dump"
        subprocess.run([
            "pg_dump",
            "-h", self.db_config["host"],
            "-U", self.db_config["user"],
            "-d", self.db_config["database"],
            "--format=custom",
            "--compress=9",
            "--file", db_backup
        ])
        
        # Filesystem backup
        fs_backup = f"{self.backup_dir}/uploads_backup_{timestamp}.tar.gz"
        subprocess.run([
            "tar", "-czf", fs_backup, "uploads/"
        ])
        
        return {
            "database_backup": db_backup,
            "filesystem_backup": fs_backup,
            "timestamp": timestamp
        }
```

### 6. Performance Optimization

#### Database Optimization
```sql
-- Optimize BYTEA storage
ALTER TABLE files ALTER COLUMN file_data SET STORAGE MAIN;

-- Create partial indexes for large files
CREATE INDEX idx_files_large_files ON files(id) 
WHERE storage_method = 'filesystem' AND file_size > 10485760;

-- Vacuum and analyze regularly
VACUUM ANALYZE files;
```

#### Filesystem Optimization
```python
# File serving optimization
class FileServer:
    def __init__(self, base_path: str):
        self.base_path = base_path
    
    def serve_file(self, file_path: str, range_header: str = None):
        """Serve file with range support for large files"""
        full_path = os.path.join(self.base_path, file_path)
        
        if not os.path.exists(full_path):
            raise FileNotFoundError()
        
        file_size = os.path.getsize(full_path)
        
        if range_header:
            # Handle range requests for large files
            return self._serve_range(full_path, range_header, file_size)
        else:
            # Serve entire file
            return self._serve_full_file(full_path)
```

### 7. Monitoring and Maintenance

#### Storage Monitoring
```python
class StorageMonitor:
    def __init__(self, db_session):
        self.db = db_session
    
    def get_storage_stats(self):
        """Get storage usage statistics"""
        # Database storage
        db_size_query = """
        SELECT 
            pg_size_pretty(pg_total_relation_size('files')) as total_size,
            COUNT(*) as file_count,
            SUM(file_size) as total_bytes
        FROM files 
        WHERE storage_method = 'database'
        """
        
        # Filesystem storage
        fs_stats = self._get_filesystem_stats()
        
        return {
            "database": db_size_query,
            "filesystem": fs_stats,
            "total_files": self._get_total_file_count()
        }
    
    def cleanup_old_files(self, days_old: int = 30):
        """Clean up old temporary files"""
        cutoff_date = datetime.now() - timedelta(days=days_old)
        
        # Find old files
        old_files = self.db.query(File).filter(
            File.upload_date < cutoff_date,
            File.storage_method == 'filesystem'
        ).all()
        
        # Delete files and database records
        for file_record in old_files:
            if os.path.exists(file_record.file_path):
                os.remove(file_record.file_path)
            self.db.delete(file_record)
        
        self.db.commit()
```

This local storage approach provides:
- **Complete control** over your data
- **Cost-effective** solution with no ongoing cloud costs
- **Privacy** with on-premises storage
- **Flexibility** to choose the best storage method per file type
- **Scalability** through hybrid approach
