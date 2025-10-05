# CVVIN Analysis Service

This is the Python-based analysis service for the CVVIN platform, providing LLM-powered resume analysis capabilities with local file storage.

## Features

- **Local File Storage**: Hybrid storage using PostgreSQL BYTEA and filesystem
- **PDF Text Extraction**: Extract text from uploaded PDF resumes
- **LLM Integration**: Ollama integration for resume analysis
- **RESTful API**: FastAPI-based service with comprehensive endpoints
- **Database Integration**: PostgreSQL with SQLAlchemy ORM

## Quick Start

### 1. Prerequisites

- Python 3.11+
- PostgreSQL 15+
- Ollama (for LLM analysis)

### 2. Installation

```bash
# Install Python dependencies
pip install -r requirements.txt

# Copy environment configuration
cp env.example .env

# Update .env with your database credentials
# Edit .env file with your PostgreSQL connection details
```

### 3. Database Setup

Run the SQL script in pgAdmin4:
```sql
-- Copy and paste the contents of ../database_setup.sql
-- This will create all necessary tables and indexes
```

### 4. Test Setup

```bash
# Run the setup test
python test_setup.py
```

### 5. Start Service

```bash
# Development mode
python -m app.main

# Or using uvicorn directly
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

## API Endpoints

### Health Check
- `GET /health/` - Service health status
- `GET /health/ready` - Readiness check
- `GET /health/live` - Liveness check

### File Management
- `POST /api/v1/files/upload` - Upload PDF file
- `GET /api/v1/files/{file_id}/download` - Download file
- `GET /api/v1/files/{file_id}/info` - Get file information
- `DELETE /api/v1/files/{file_id}` - Delete file

### Analysis (Coming Soon)
- `POST /api/v1/analysis/resume` - Analyze resume
- `GET /api/v1/analysis/history` - Get analysis history
- `GET /api/v1/analysis/{analysis_id}` - Get specific analysis

## File Storage Strategy

### Small Files (< 10MB)
- Stored in PostgreSQL BYTEA column
- Fast access and ACID compliance
- Automatic backup with database

### Large Files (> 10MB)
- Stored on local filesystem
- Database stores metadata and file path
- Better performance for large files

## Configuration

Update `.env` file with your settings:

```bash
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/cvvin

# File Storage
UPLOAD_DIR=uploads
MAX_DB_FILE_SIZE=10485760  # 10MB
MAX_FILE_SIZE=52428800      # 50MB

# Ollama
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=resume-analyzer
```

## Development

### Project Structure
```
analysis-service/
├── app/
│   ├── api/v1/          # API endpoints
│   ├── core/            # Core configuration
│   ├── models/          # Database models
│   ├── schemas/         # Pydantic schemas
│   ├── services/        # Business logic
│   └── utils/           # Utility functions
├── uploads/             # File storage
├── tests/               # Test files
└── requirements.txt     # Dependencies
```

### Testing

```bash
# Run tests
pytest tests/

# Run with coverage
pytest --cov=app tests/
```

## Troubleshooting

### Database Connection Issues
1. Verify PostgreSQL is running
2. Check database credentials in `.env`
3. Ensure database `cvvin` exists
4. Run `python test_setup.py` to diagnose

### File Upload Issues
1. Check upload directory permissions
2. Verify file size limits
3. Ensure file is valid PDF

### Service Won't Start
1. Check all dependencies are installed
2. Verify database connection
3. Check port 8001 is available

## Next Steps

1. **Ollama Integration**: Set up Ollama and create resume analysis model
2. **Authentication**: Implement Firebase JWT validation
3. **Analysis Endpoints**: Complete resume analysis API
4. **Frontend Integration**: Connect React frontend to new service
5. **Docker Deployment**: Containerize the service

## Support

For issues or questions:
1. Check the logs for error messages
2. Run `python test_setup.py` to diagnose setup issues
3. Review the configuration in `.env`
4. Check database connection and permissions


