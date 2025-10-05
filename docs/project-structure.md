# CVVIN Platform - Project Structure Recommendations

## Overview

This document outlines the recommended project structure for the CVVIN platform, incorporating the existing Node.js backend, new Python analysis service, and maintaining scalability for future expansion.

## Recommended Project Structure

```
cvvin-platform/
├── README.md
├── package.json                    # Workspace configuration
├── docker-compose.yml              # Development environment
├── docker-compose.prod.yml         # Production environment
├── .github/
│   └── workflows/
│       ├── ci.yml                  # Continuous integration
│       └── deploy.yml              # Deployment pipeline
├── docs/                           # Platform documentation
│   ├── database-design.md          # Database architecture
│   ├── backend-architecture.md     # Backend service design
│   ├── trial-analysis-recommendations.md
│   ├── api-documentation.md        # API specifications
│   └── deployment-guide.md         # Deployment instructions
├── frontend/                       # React frontend (existing)
│   ├── src/
│   ├── package.json
│   └── ...
├── backend/                        # Node.js authentication service (existing)
│   ├── src/
│   ├── package.json
│   └── ...
├── analysis-service/               # New Python analysis service
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                 # FastAPI application
│   │   ├── config.py               # Configuration management
│   │   ├── dependencies.py         # Dependency injection
│   │   └── middleware.py           # Custom middleware
│   ├── api/
│   │   ├── __init__.py
│   │   └── v1/
│   │       ├── __init__.py
│   │       ├── analysis.py         # Resume analysis endpoints
│   │       ├── files.py            # File management endpoints
│   │       └── health.py           # Health check endpoints
│   ├── core/
│   │   ├── __init__.py
│   │   ├── database.py             # Database connection
│   │   ├── security.py             # Authentication/authorization
│   │   ├── exceptions.py           # Custom exceptions
│   │   └── logging.py              # Logging configuration
│   ├── models/
│   │   ├── __init__.py
│   │   ├── user.py                 # User models
│   │   ├── analysis.py             # Analysis models
│   │   ├── session.py              # Session models
│   │   └── file.py                 # File models
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── analysis.py             # Pydantic schemas
│   │   ├── user.py                 # User schemas
│   │   └── file.py                 # File schemas
│   ├── services/
│   │   ├── __init__.py
│   │   ├── ollama_service.py        # LLM integration
│   │   ├── file_service.py         # File processing
│   │   ├── analysis_service.py     # Business logic
│   │   └── notification_service.py # Notifications
│   ├── utils/
│   │   ├── __init__.py
│   │   ├── pdf_extractor.py        # PDF text extraction
│   │   ├── text_processor.py       # Text preprocessing
│   │   ├── validators.py           # Input validation
│   │   └── helpers.py              # Utility functions
│   ├── workers/
│   │   ├── __init__.py
│   │   ├── analysis_worker.py      # Background processing
│   │   └── file_worker.py          # File processing worker
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── test_api/
│   │   ├── test_services/
│   │   └── test_utils/
│   ├── requirements.txt             # Python dependencies
│   ├── requirements-dev.txt         # Development dependencies
│   ├── Dockerfile                   # Container configuration
│   ├── .env.example                 # Environment variables template
│   └── pyproject.toml               # Python project configuration
├── api-gateway/                     # API Gateway service
│   ├── src/
│   │   ├── index.js                 # Express gateway
│   │   ├── routes/
│   │   │   ├── auth.js              # Auth service routing
│   │   │   ├── analysis.js          # Analysis service routing
│   │   │   └── health.js            # Health checks
│   │   ├── middleware/
│   │   │   ├── auth.js              # Authentication middleware
│   │   │   ├── rate-limit.js        # Rate limiting
│   │   │   └── cors.js              # CORS configuration
│   │   └── config/
│   │       └── gateway.js            # Gateway configuration
│   ├── package.json
│   └── Dockerfile
├── shared/                          # Shared utilities and types
│   ├── types/                       # TypeScript type definitions
│   │   ├── user.ts
│   │   ├── analysis.ts
│   │   └── api.ts
│   ├── utils/                       # Shared utility functions
│   │   ├── validation.ts
│   │   ├── formatting.ts
│   │   └── constants.ts
│   └── schemas/                     # Shared validation schemas
│       ├── user.schema.ts
│       └── analysis.schema.ts
├── infrastructure/                  # Infrastructure as Code
│   ├── terraform/                   # Terraform configurations
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── kubernetes/                  # Kubernetes manifests
│   │   ├── namespaces/
│   │   ├── deployments/
│   │   ├── services/
│   │   └── ingress/
│   └── monitoring/                  # Monitoring configurations
│       ├── prometheus/
│       ├── grafana/
│       └── alertmanager/
├── scripts/                         # Deployment and utility scripts
│   ├── setup-dev.sh                 # Development setup
│   ├── deploy.sh                    # Deployment script
│   ├── backup-db.sh                 # Database backup
│   └── migrate.sh                   # Database migration
├── Trial/                           # Original trial implementation (preserved)
│   ├── Modelfile
│   └── ollama_main.py
└── .env.example                     # Root environment template
```

## Service Architecture Overview

### 1. Frontend Service (React/TypeScript)
- **Purpose**: User interface and user experience
- **Technology**: React 18, TypeScript, Vite, Tailwind CSS
- **Responsibilities**: 
  - User authentication UI
  - Resume upload and management
  - Analysis results display
  - Interview session management
  - Progress tracking and analytics

### 2. API Gateway (Node.js/Express)
- **Purpose**: Unified entry point and request routing
- **Technology**: Express.js, Node.js
- **Responsibilities**:
  - Request routing to appropriate services
  - Authentication and authorization
  - Rate limiting and security
  - Request/response transformation
  - Health monitoring

### 3. Authentication Service (Node.js/Express) - Existing
- **Purpose**: User authentication and management
- **Technology**: Express.js, Firebase Admin SDK
- **Responsibilities**:
  - User registration and login
  - Password reset and OTP management
  - Firebase integration
  - User profile management

### 4. Analysis Service (Python/FastAPI) - New
- **Purpose**: LLM-powered resume analysis
- **Technology**: FastAPI, Python 3.11+, Ollama
- **Responsibilities**:
  - Resume text extraction and processing
  - LLM analysis using Ollama
  - Analysis result storage and retrieval
  - File management and processing
  - Background job processing

### 5. Database (PostgreSQL)
- **Purpose**: Data persistence and management
- **Technology**: PostgreSQL 15+
- **Responsibilities**:
  - User data storage
  - Analysis results storage
  - Session management
  - File metadata storage
  - Audit logging

### 6. File Storage (AWS S3)
- **Purpose**: File storage and management
- **Technology**: AWS S3, CloudFront
- **Responsibilities**:
  - Resume PDF storage
  - Profile image storage
  - Document versioning
  - CDN distribution

## Development Workflow

### 1. Local Development Setup

```bash
# Clone repository
git clone <repository-url>
cd cvvin-platform

# Install dependencies
npm run install:all

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Start development environment
docker-compose up -d

# Or start individual services
npm run dev:frontend
npm run dev:backend
npm run dev:analysis
npm run dev:gateway
```

### 2. Service Communication

```mermaid
graph TB
    Frontend[Frontend React App]
    Gateway[API Gateway]
    Auth[Auth Service]
    Analysis[Analysis Service]
    DB[(PostgreSQL)]
    S3[(AWS S3)]
    Ollama[Ollama LLM]

    Frontend --> Gateway
    Gateway --> Auth
    Gateway --> Analysis
    Auth --> DB
    Analysis --> DB
    Analysis --> S3
    Analysis --> Ollama
```

### 3. API Endpoints Structure

#### Authentication Service (Port 3001)
```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/forgot-password
POST /api/auth/verify-otp
POST /api/auth/reset-password
GET  /api/auth/profile
PUT  /api/auth/profile
```

#### Analysis Service (Port 8001)
```
POST /api/v1/analysis/resume
GET  /api/v1/analysis/history
GET  /api/v1/analysis/{id}
POST /api/v1/files/upload
GET  /api/v1/files/{id}
DELETE /api/v1/files/{id}
```

#### API Gateway (Port 8000)
```
GET  /health
POST /api/auth/*          # Proxy to auth service
POST /api/v1/analysis/*   # Proxy to analysis service
POST /api/v1/files/*      # Proxy to analysis service
```

## Configuration Management

### 1. Environment Variables

#### Root .env
```bash
# Environment
NODE_ENV=development
LOG_LEVEL=info

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/cvvin

# AWS Configuration
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
S3_BUCKET_NAME=cvvin-files

# Services
AUTH_SERVICE_URL=http://localhost:3001
ANALYSIS_SERVICE_URL=http://localhost:8001
FRONTEND_URL=http://localhost:8080

# Security
JWT_SECRET=your_jwt_secret
CORS_ORIGINS=http://localhost:8080,http://localhost:3000
```

#### Analysis Service .env
```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/cvvin

# Ollama Configuration
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=resume-analyzer

# File Processing
MAX_FILE_SIZE=10485760  # 10MB
ALLOWED_FILE_TYPES=application/pdf

# Redis (for caching and queues)
REDIS_URL=redis://localhost:6379

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
```

### 2. Docker Configuration

#### docker-compose.yml
```yaml
version: '3.8'

services:
  frontend:
    build: ./frontend
    ports:
      - "8080:8080"
    environment:
      - VITE_API_URL=http://localhost:8000
    depends_on:
      - api-gateway

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
      - DATABASE_URL=postgresql://cvvin:password@postgres:5432/cvvin
    depends_on:
      - postgres

  analysis-service:
    build: ./analysis-service
    ports:
      - "8001:8001"
    environment:
      - DATABASE_URL=postgresql://cvvin:password@postgres:5432/cvvin
      - OLLAMA_HOST=http://ollama:11434
    depends_on:
      - postgres
      - redis
      - ollama

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=cvvin
      - POSTGRES_USER=cvvin
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

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
```

## Testing Strategy

### 1. Unit Testing
```bash
# Frontend tests
cd frontend && npm test

# Backend tests
cd backend && npm test

# Analysis service tests
cd analysis-service && pytest
```

### 2. Integration Testing
```bash
# API integration tests
npm run test:integration

# End-to-end tests
npm run test:e2e
```

### 3. Load Testing
```bash
# Load test analysis service
npm run test:load
```

## Deployment Strategy

### 1. Development Environment
- **Local Docker**: All services in containers
- **Hot Reload**: Development servers with file watching
- **Mock Services**: Optional mock services for testing

### 2. Staging Environment
- **Cloud Deployment**: AWS ECS or Kubernetes
- **Database**: Managed PostgreSQL (RDS)
- **File Storage**: S3 with CloudFront
- **Monitoring**: Basic logging and metrics

### 3. Production Environment
- **High Availability**: Multi-AZ deployment
- **Auto Scaling**: Horizontal pod autoscaling
- **Monitoring**: Full observability stack
- **Security**: WAF, SSL, secrets management

## Migration Plan

### Phase 1: Foundation (Weeks 1-2)
1. Set up new project structure
2. Create API Gateway service
3. Implement basic analysis service
4. Set up development environment

### Phase 2: Core Features (Weeks 3-4)
1. Integrate Ollama analysis
2. Implement file processing
3. Add database persistence
4. Create API endpoints

### Phase 3: Integration (Weeks 5-6)
1. Connect frontend to new services
2. Implement authentication flow
3. Add error handling and logging
4. Performance optimization

### Phase 4: Production (Weeks 7-8)
1. Deploy to staging environment
2. Load testing and optimization
3. Security hardening
4. Production deployment

## Benefits of This Structure

### 1. Scalability
- **Microservices**: Independent scaling of services
- **Horizontal Scaling**: Add more instances as needed
- **Load Distribution**: Efficient request routing

### 2. Maintainability
- **Separation of Concerns**: Clear service boundaries
- **Technology Flexibility**: Use best tool for each service
- **Independent Deployment**: Deploy services separately

### 3. Development Experience
- **Team Collaboration**: Different teams can work on different services
- **Technology Choice**: Use appropriate technology for each service
- **Testing**: Isolated testing of each service

### 4. Future Expansion
- **New Services**: Easy to add new microservices
- **Feature Flags**: Gradual feature rollouts
- **A/B Testing**: Test different implementations

This structure provides a solid foundation for the CVVIN platform while maintaining the existing functionality and enabling future growth and expansion.

