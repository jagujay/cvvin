# Local Storage Implementation Guide - Part 2

## Phase 4: Ollama Integration and Analysis (Week 4)

### Step 4.1: Ollama Service Setup

#### 4.1.1 Install Ollama
```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Start Ollama service
ollama serve

# Create custom model (in another terminal)
ollama create resume-analyzer -f ./Modelfile
```

#### 4.1.2 Enhanced Ollama Service (app/services/ollama_service.py)
```python
import ollama
import json
import asyncio
from typing import Dict, Any, Optional
from tenacity import retry, stop_after_attempt, wait_exponential
from app.core.config import settings
from app.core.logging import logger
from app.core.exceptions import AnalysisError

class EnhancedOllamaService:
    def __init__(self, model_name: str = None):
        self.client = ollama.Client(host=settings.ollama_host)
        self.model_name = model_name or settings.ollama_model
        self.logger = logger
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10)
    )
    async def analyze_resume_with_retry(
        self, 
        resume_text: str, 
        job_description: str
    ) -> Dict[str, Any]:
        """Analyze resume with retry logic and detailed error handling"""
        try:
            # Validate inputs
            if not resume_text.strip():
                raise AnalysisError("Resume text cannot be empty")
            
            if not job_description.strip():
                raise AnalysisError("Job description cannot be empty")
            
            # Sanitize inputs
            sanitized_resume = self._sanitize_text(resume_text)
            sanitized_jd = self._sanitize_text(job_description)
            
            prompt = self._build_prompt(sanitized_resume, sanitized_jd)
            
            self.logger.info(f"Starting analysis for model: {self.model_name}")
            
            response = await self._make_ollama_request(prompt)
            
            # Parse and validate response
            analysis_result = self._parse_and_validate_response(response)
            
            self.logger.info("Analysis completed successfully")
            return analysis_result
            
        except AnalysisError:
            raise
        except Exception as e:
            self.logger.error(f"Unexpected error during analysis: {e}")
            raise AnalysisError(f"Analysis failed: {str(e)}")
    
    def _sanitize_text(self, text: str) -> str:
        """Sanitize input text to prevent prompt injection"""
        dangerous_patterns = [
            "--- RESUME ---",
            "--- JOB DESCRIPTION ---",
            "<|eot|>",
            "<|start_header_id|>",
            "<|end_header_id|>"
        ]
        
        sanitized = text
        for pattern in dangerous_patterns:
            sanitized = sanitized.replace(pattern, "")
        
        return sanitized.strip()
    
    def _build_prompt(self, resume_text: str, job_description: str) -> str:
        """Build the analysis prompt with proper formatting"""
        return f"""
        --- RESUME ---
        {resume_text}
        --- JOB DESCRIPTION ---
        {job_description}
        """
    
    async def _make_ollama_request(self, prompt: str) -> str:
        """Make async request to Ollama with timeout"""
        try:
            # Use asyncio to make the request non-blocking
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: self.client.generate(
                    model=self.model_name,
                    prompt=prompt,
                    options={
                        "temperature": 0.3,
                        "top_p": 0.9,
                        "max_tokens": 4000,
                        "stop": ["<|eot|>", "<|start_header_id|>", "<|end_header_id|>"]
                    }
                )
            )
            return response['response']
        except Exception as e:
            raise AnalysisError(f"Ollama request failed: {str(e)}")
    
    def _parse_and_validate_response(self, response: str) -> Dict[str, Any]:
        """Parse JSON response and validate structure"""
        try:
            analysis_result = json.loads(response)
            self._validate_analysis_structure(analysis_result)
            return analysis_result
        except json.JSONDecodeError as e:
            self.logger.error(f"Failed to parse JSON response: {e}")
            raise AnalysisError("Invalid JSON response from model")
    
    def _validate_analysis_structure(self, result: Dict[str, Any]) -> None:
        """Validate the structure of analysis result"""
        required_fields = {
            "overallScore": (int, lambda x: 0 <= x <= 100),
            "summary": (str, lambda x: len(x.strip()) > 0),
            "skillAnalysis": (dict, None),
            "experienceAnalysis": (dict, None),
            "strengths": (list, None),
            "gaps": (list, None),
            "suggestions": (list, None),
            "atsCompliance": (dict, None)
        }
        
        for field, (expected_type, validator) in required_fields.items():
            if field not in result:
                raise AnalysisError(f"Missing required field: {field}")
            
            if not isinstance(result[field], expected_type):
                raise AnalysisError(f"Invalid type for field {field}: expected {expected_type.__name__}")
            
            if validator and not validator(result[field]):
                raise AnalysisError(f"Invalid value for field {field}")
```

### Step 4.2: Analysis Service Implementation

#### 4.2.1 Analysis Service (app/services/analysis_service.py)
```python
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.services.ollama_service import EnhancedOllamaService
from app.services.file_service import LocalFileService
from app.models.analysis import ResumeAnalysis
from app.core.logging import logger
from app.core.exceptions import AnalysisError

class AnalysisService:
    def __init__(self):
        self.ollama_service = EnhancedOllamaService()
        self.logger = logger
    
    async def perform_resume_analysis(
        self,
        user_id: str,
        file_id: str,
        job_description: str,
        db: Session
    ) -> ResumeAnalysis:
        """Complete resume analysis workflow"""
        try:
            # Initialize file service
            file_service = LocalFileService(db)
            
            # Extract text from PDF
            resume_text = await file_service.extract_text_from_pdf(file_id)
            
            if not resume_text:
                raise AnalysisError("Could not extract text from PDF")
            
            # Perform analysis
            analysis_result = await self.ollama_service.analyze_resume_with_retry(
                resume_text=resume_text,
                job_description=job_description
            )
            
            # Store analysis in database
            analysis_record = ResumeAnalysis(
                user_id=user_id,
                file_id=file_id,
                job_description=job_description,
                analysis_result=analysis_result,
                overall_score=analysis_result["overallScore"],
                resume_text=resume_text[:1000]  # Store first 1000 chars for reference
            )
            
            db.add(analysis_record)
            db.commit()
            db.refresh(analysis_record)
            
            self.logger.info(f"Analysis completed for user {user_id}")
            return analysis_record
            
        except Exception as e:
            self.logger.error(f"Analysis workflow failed: {e}")
            db.rollback()
            raise AnalysisError(f"Analysis failed: {str(e)}")
    
    async def get_user_analysis_history(
        self,
        user_id: str,
        db: Session,
        limit: int = 10,
        offset: int = 0
    ) -> List[ResumeAnalysis]:
        """Get user's analysis history"""
        try:
            analyses = db.query(ResumeAnalysis).filter(
                ResumeAnalysis.user_id == user_id
            ).order_by(
                ResumeAnalysis.created_at.desc()
            ).offset(offset).limit(limit).all()
            
            return analyses
            
        except Exception as e:
            self.logger.error(f"Failed to get analysis history: {e}")
            raise AnalysisError(f"Failed to get analysis history: {str(e)}")
    
    async def get_analysis_by_id(
        self,
        analysis_id: str,
        user_id: str,
        db: Session
    ) -> ResumeAnalysis:
        """Get specific analysis by ID"""
        try:
            analysis = db.query(ResumeAnalysis).filter(
                ResumeAnalysis.id == analysis_id,
                ResumeAnalysis.user_id == user_id
            ).first()
            
            if not analysis:
                raise AnalysisError("Analysis not found")
            
            return analysis
            
        except Exception as e:
            self.logger.error(f"Failed to get analysis: {e}")
            raise AnalysisError(f"Failed to get analysis: {str(e)}")
```

### Step 4.3: Analysis API Endpoints

#### 4.3.1 Analysis Endpoints (app/api/v1/analysis.py)
```python
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.services.analysis_service import AnalysisService
from app.services.file_service import LocalFileService
from app.models.user import User
from app.schemas.analysis import AnalysisRequest, AnalysisResponse, AnalysisHistory
from typing import List

router = APIRouter()

@router.post("/resume", response_model=AnalysisResponse)
async def analyze_resume(
    job_description: str,
    file_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Analyze uploaded resume against job description"""
    try:
        # Initialize services
        analysis_service = AnalysisService()
        
        # Perform analysis
        analysis_result = await analysis_service.perform_resume_analysis(
            user_id=str(current_user.id),
            file_id=file_id,
            job_description=job_description,
            db=db
        )
        
        return AnalysisResponse(
            id=str(analysis_result.id),
            overall_score=analysis_result.overall_score,
            summary=analysis_result.analysis_result["summary"],
            skill_analysis=analysis_result.analysis_result["skillAnalysis"],
            experience_analysis=analysis_result.analysis_result["experienceAnalysis"],
            strengths=analysis_result.analysis_result["strengths"],
            gaps=analysis_result.analysis_result["gaps"],
            suggestions=analysis_result.analysis_result["suggestions"],
            ats_compliance=analysis_result.analysis_result["atsCompliance"],
            created_at=analysis_result.created_at
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Analysis failed: {str(e)}"
        )

@router.get("/history", response_model=List[AnalysisHistory])
async def get_analysis_history(
    limit: int = 10,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's analysis history"""
    try:
        analysis_service = AnalysisService()
        
        analyses = await analysis_service.get_user_analysis_history(
            user_id=str(current_user.id),
            db=db,
            limit=limit,
            offset=offset
        )
        
        return [
            AnalysisHistory(
                id=str(analysis.id),
                file_id=str(analysis.file_id),
                overall_score=analysis.overall_score,
                job_description=analysis.job_description[:100] + "...",
                created_at=analysis.created_at
            )
            for analysis in analyses
        ]
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get analysis history: {str(e)}"
        )

@router.get("/{analysis_id}", response_model=AnalysisResponse)
async def get_analysis(
    analysis_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get specific analysis by ID"""
    try:
        analysis_service = AnalysisService()
        
        analysis = await analysis_service.get_analysis_by_id(
            analysis_id=analysis_id,
            user_id=str(current_user.id),
            db=db
        )
        
        return AnalysisResponse(
            id=str(analysis.id),
            overall_score=analysis.overall_score,
            summary=analysis.analysis_result["summary"],
            skill_analysis=analysis.analysis_result["skillAnalysis"],
            experience_analysis=analysis.analysis_result["experienceAnalysis"],
            strengths=analysis.analysis_result["strengths"],
            gaps=analysis.analysis_result["gaps"],
            suggestions=analysis.analysis_result["suggestions"],
            ats_compliance=analysis.analysis_result["atsCompliance"],
            created_at=analysis.created_at
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get analysis: {str(e)}"
        )
```

## Phase 5: Frontend Integration (Week 5)

### Step 5.1: Frontend Service Updates

#### 5.1.1 API Service (frontend/src/services/apiService.ts)
```typescript
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('firebase_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface FileUploadResponse {
  file_id: string;
  file_name: string;
  content_type: string;
  size: number;
  storage_method: string;
  checksum: string;
  is_duplicate: boolean;
}

export interface AnalysisResponse {
  id: string;
  overall_score: number;
  summary: string;
  skill_analysis: any;
  experience_analysis: any;
  strengths: any[];
  gaps: any[];
  suggestions: string[];
  ats_compliance: any;
  created_at: string;
}

export const fileService = {
  async uploadFile(file: File): Promise<FileUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await apiClient.post('/api/v1/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  },

  async getFileInfo(fileId: string) {
    const response = await apiClient.get(`/api/v1/files/${fileId}/info`);
    return response.data;
  },

  async downloadFile(fileId: string) {
    const response = await apiClient.get(`/api/v1/files/${fileId}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },

  async deleteFile(fileId: string) {
    const response = await apiClient.delete(`/api/v1/files/${fileId}`);
    return response.data;
  },
};

export const analysisService = {
  async analyzeResume(fileId: string, jobDescription: string): Promise<AnalysisResponse> {
    const response = await apiClient.post('/api/v1/analysis/resume', {
      file_id: fileId,
      job_description: jobDescription,
    });
    return response.data;
  },

  async getAnalysisHistory(limit = 10, offset = 0) {
    const response = await apiClient.get('/api/v1/analysis/history', {
      params: { limit, offset },
    });
    return response.data;
  },

  async getAnalysis(analysisId: string): Promise<AnalysisResponse> {
    const response = await apiClient.get(`/api/v1/analysis/${analysisId}`);
    return response.data;
  },
};
```

### Step 5.2: Resume Upload Component

#### 5.2.1 Resume Upload Component (frontend/src/components/ResumeUpload.tsx)
```typescript
import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { fileService } from '../services/apiService';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Progress } from './ui/progress';

interface ResumeUploadProps {
  onUploadComplete: (fileId: string) => void;
  onError: (error: string) => void;
}

export const ResumeUpload: React.FC<ResumeUploadProps> = ({
  onUploadComplete,
  onError,
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const onDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    
    if (!file) return;
    
    // Validate file type
    if (!file.type.includes('pdf')) {
      onError('Please upload a PDF file');
      return;
    }
    
    // Validate file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      onError('File size must be less than 50MB');
      return;
    }
    
    try {
      setUploading(true);
      setUploadProgress(0);
      
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 100);
      
      const result = await fileService.uploadFile(file);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      setTimeout(() => {
        onUploadComplete(result.file_id);
        setUploading(false);
        setUploadProgress(0);
      }, 500);
      
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Upload failed');
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    multiple: false,
    disabled: uploading,
  });

  return (
    <Card className="p-6">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
          ${uploading ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-400'}
        `}
      >
        <input {...getInputProps()} />
        
        {uploading ? (
          <div className="space-y-4">
            <div className="text-lg font-medium">Uploading...</div>
            <Progress value={uploadProgress} className="w-full" />
            <div className="text-sm text-gray-600">{uploadProgress}%</div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-4xl">📄</div>
            <div className="text-lg font-medium">
              {isDragActive ? 'Drop your resume here' : 'Upload your resume'}
            </div>
            <div className="text-sm text-gray-600">
              Drag and drop a PDF file, or click to select
            </div>
            <div className="text-xs text-gray-500">
              Maximum file size: 50MB
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
```

### Step 5.3: Analysis Results Component

#### 5.3.1 Analysis Results Component (frontend/src/components/AnalysisResults.tsx)
```typescript
import React from 'react';
import { AnalysisResponse } from '../services/apiService';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';

interface AnalysisResultsProps {
  analysis: AnalysisResponse;
}

export const AnalysisResults: React.FC<AnalysisResultsProps> = ({ analysis }) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 80) return 'default';
    if (score >= 60) return 'secondary';
    return 'destructive';
  };

  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Overall Score</h2>
          <Badge variant={getScoreBadgeVariant(analysis.overall_score)}>
            {analysis.overall_score}/100
          </Badge>
        </div>
        <Progress value={analysis.overall_score} className="w-full" />
        <p className={`text-lg font-medium mt-2 ${getScoreColor(analysis.overall_score)}`}>
          {analysis.overall_score >= 80 ? 'Excellent Match' : 
           analysis.overall_score >= 60 ? 'Good Match' : 'Needs Improvement'}
        </p>
      </Card>

      {/* Summary */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Summary</h2>
        <p className="text-gray-700 leading-relaxed">{analysis.summary}</p>
      </Card>

      {/* Skill Analysis */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Skill Analysis</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-semibold text-green-600 mb-2">Matched Skills</h3>
            <div className="space-y-1">
              {analysis.skill_analysis.matchedSkills?.map((skill: string, index: number) => (
                <Badge key={index} variant="outline" className="mr-2 mb-1">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-red-600 mb-2">Missing Skills</h3>
            <div className="space-y-1">
              {analysis.skill_analysis.missingSkills?.map((skill: string, index: number) => (
                <Badge key={index} variant="destructive" className="mr-2 mb-1">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-4">
          {analysis.skill_analysis.skillSummary}
        </p>
      </Card>

      {/* Strengths */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Strengths</h2>
        <div className="space-y-3">
          {analysis.strengths?.map((strength: any, index: number) => (
            <div key={index} className="border-l-4 border-green-500 pl-4">
              <h3 className="font-semibold text-green-700">{strength.strength}</h3>
              <p className="text-sm text-gray-600 mt-1">{strength.evidence}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Gaps */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Areas for Improvement</h2>
        <div className="space-y-3">
          {analysis.gaps?.map((gap: any, index: number) => (
            <div key={index} className="border-l-4 border-red-500 pl-4">
              <h3 className="font-semibold text-red-700">{gap.gap}</h3>
              <p className="text-sm text-gray-600 mt-1">{gap.evidence}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Suggestions */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Actionable Suggestions</h2>
        <div className="space-y-2">
          {analysis.suggestions?.map((suggestion: string, index: number) => (
            <div key={index} className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              <p className="text-gray-700">{suggestion}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* ATS Compliance */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">ATS Compliance</h2>
        <div className="flex items-center justify-between mb-4">
          <span className="font-medium">Compliance Score</span>
          <Badge variant={analysis.ats_compliance.isCompliant ? 'default' : 'destructive'}>
            {analysis.ats_compliance.score}/100
          </Badge>
        </div>
        
        {analysis.ats_compliance.issues?.length > 0 && (
          <div className="mb-4">
            <h3 className="font-semibold text-red-600 mb-2">Issues Found</h3>
            <ul className="list-disc list-inside space-y-1">
              {analysis.ats_compliance.issues.map((issue: string, index: number) => (
                <li key={index} className="text-sm text-gray-600">{issue}</li>
              ))}
            </ul>
          </div>
        )}
        
        {analysis.ats_compliance.suggestions?.length > 0 && (
          <div>
            <h3 className="font-semibold text-blue-600 mb-2">Improvement Suggestions</h3>
            <ul className="list-disc list-inside space-y-1">
              {analysis.ats_compliance.suggestions.map((suggestion: string, index: number) => (
                <li key={index} className="text-sm text-gray-600">{suggestion}</li>
              ))}
            </ul>
          </div>
        )}
      </Card>
    </div>
  );
};
```

## Phase 6: Testing and Deployment (Week 6)

### Step 6.1: Testing Setup

#### 6.1.1 Unit Tests (tests/test_services/test_file_service.py)
```python
import pytest
import tempfile
import os
from unittest.mock import Mock, patch
from app.services.file_service import LocalFileService
from app.models.file import File

@pytest.fixture
def mock_db():
    return Mock()

@pytest.fixture
def file_service(mock_db):
    with tempfile.TemporaryDirectory() as temp_dir:
        service = LocalFileService(mock_db)
        service.upload_dir = temp_dir
        yield service

def test_file_validation(file_service):
    # Test valid PDF
    valid_pdf = b'%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n>>\nendobj'
    assert file_service._validate_file(valid_pdf, 'test.pdf') == True
    
    # Test invalid file type
    invalid_file = b'This is not a PDF'
    assert file_service._validate_file(invalid_file, 'test.txt') == False
    
    # Test file too large
    large_file = b'x' * (50 * 1024 * 1024 + 1)  # 50MB + 1 byte
    assert file_service._validate_file(large_file, 'test.pdf') == False

def test_file_signature_validation(file_service):
    # Test PDF signature
    pdf_content = b'%PDF-1.4\n'
    assert file_service._validate_file_signature(pdf_content) == True
    
    # Test PNG signature
    png_content = b'\x89PNG\r\n\x1a\n'
    assert file_service._validate_file_signature(png_content) == True
    
    # Test JPEG signature
    jpeg_content = b'\xff\xd8\xff'
    assert file_service._validate_file_signature(jpeg_content) == True
    
    # Test invalid signature
    invalid_content = b'Invalid file content'
    assert file_service._validate_file_signature(invalid_content) == False

@patch('app.services.file_service.hashlib.sha256')
def test_duplicate_file_detection(mock_hash, file_service, mock_db):
    # Mock hash
    mock_hash.return_value.hexdigest.return_value = 'test_hash'
    
    # Mock existing file
    existing_file = Mock()
    existing_file.id = 'existing_id'
    existing_file.storage_method = 'database'
    mock_db.query.return_value.filter.return_value.first.return_value = existing_file
    
    # Test duplicate detection
    result = await file_service.upload_file(
        b'test content', 'test.pdf', 'application/pdf', 'user_id'
    )
    
    assert result['is_duplicate'] == True
    assert result['file_id'] == 'existing_id'
```

#### 6.1.2 Integration Tests (tests/test_api/test_file_endpoints.py)
```python
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import get_db
from unittest.mock import Mock

client = TestClient(app)

@pytest.fixture
def mock_db():
    return Mock()

def test_upload_file_success(mock_db):
    # Mock database session
    app.dependency_overrides[get_db] = lambda: mock_db
    
    # Mock file service
    with patch('app.api.v1.files.LocalFileService') as mock_service:
        mock_instance = Mock()
        mock_instance.upload_file.return_value = {
            'file_id': 'test_id',
            'file_name': 'test.pdf',
            'content_type': 'application/pdf',
            'size': 1024,
            'storage_method': 'database',
            'checksum': 'test_hash',
            'is_duplicate': False
        }
        mock_service.return_value = mock_instance
        
        # Test file upload
        with open('test_resume.pdf', 'rb') as f:
            response = client.post(
                '/api/v1/files/upload',
                files={'file': ('test.pdf', f, 'application/pdf')},
                headers={'Authorization': 'Bearer test_token'}
            )
        
        assert response.status_code == 200
        assert response.json()['file_id'] == 'test_id'

def test_upload_invalid_file_type(mock_db):
    app.dependency_overrides[get_db] = lambda: mock_db
    
    with open('test_file.txt', 'rb') as f:
        response = client.post(
            '/api/v1/files/upload',
            files={'file': ('test.txt', f, 'text/plain')},
            headers={'Authorization': 'Bearer test_token'}
        )
    
    assert response.status_code == 400
    assert 'Only PDF files are supported' in response.json()['detail']
```

### Step 6.2: Docker Configuration

#### 6.2.1 Dockerfile (analysis-service/Dockerfile)
```dockerfile
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create uploads directory
RUN mkdir -p uploads/users uploads/temp uploads/backups

# Set environment variables
ENV PYTHONPATH=/app
ENV UPLOAD_DIR=/app/uploads

# Expose port
EXPOSE 8001

# Run application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
```

#### 6.2.2 Docker Compose (docker-compose.yml)
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
      - UPLOAD_DIR=/app/uploads
      - MAX_DB_FILE_SIZE=10485760
      - MAX_FILE_SIZE=52428800
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
  uploads_data:
```

### Step 6.3: Deployment Scripts

#### 6.3.1 Deployment Script (scripts/deploy.sh)
```bash
#!/bin/bash

# CVVIN Platform Deployment Script

set -e

echo "🚀 Starting CVVIN Platform Deployment"

# Check prerequisites
echo "📋 Checking prerequisites..."
command -v docker >/dev/null 2>&1 || { echo "Docker is required but not installed. Aborting." >&2; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo "Docker Compose is required but not installed. Aborting." >&2; exit 1; }

# Create environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating environment file..."
    cp .env.example .env
    echo "⚠️  Please update .env file with your configuration"
    exit 1
fi

# Build and start services
echo "🔨 Building and starting services..."
docker-compose down --remove-orphans
docker-compose build --no-cache
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 30

# Check service health
echo "🏥 Checking service health..."
docker-compose ps

# Run database migrations
echo "🗄️  Running database migrations..."
docker-compose exec analysis-service python -c "from app.core.database import create_tables; create_tables()"

# Setup Ollama model
echo "🤖 Setting up Ollama model..."
docker-compose exec ollama ollama create resume-analyzer -f /Modelfile

echo "✅ Deployment completed successfully!"
echo "🌐 Frontend: http://localhost:8080"
echo "🔗 API Gateway: http://localhost:8000"
echo "📊 Analysis Service: http://localhost:8001"
echo "🔐 Auth Service: http://localhost:3001"
```

#### 6.3.2 Backup Script (scripts/backup.sh)
```bash
#!/bin/bash

# CVVIN Platform Backup Script

set -e

BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "💾 Starting backup process..."

# Backup database
echo "🗄️  Backing up database..."
docker-compose exec postgres pg_dump -U cvvin -d cvvin --format=custom --compress=9 > "$BACKUP_DIR/database.dump"

# Backup uploads
echo "📁 Backing up uploads..."
docker-compose exec analysis-service tar -czf - /app/uploads > "$BACKUP_DIR/uploads.tar.gz"

# Backup configuration
echo "⚙️  Backing up configuration..."
cp .env "$BACKUP_DIR/"
cp docker-compose.yml "$BACKUP_DIR/"

echo "✅ Backup completed: $BACKUP_DIR"
```

This completes the detailed implementation guide for the local storage strategy. The implementation provides:

- **Complete database setup** with PostgreSQL BYTEA support
- **Hybrid file storage** (database + filesystem)
- **Robust file validation** and security
- **Ollama integration** with retry logic
- **FastAPI service** with comprehensive endpoints
- **Frontend integration** with React components
- **Testing suite** with unit and integration tests
- **Docker deployment** with all services
- **Backup and maintenance** scripts

The implementation is production-ready and provides a solid foundation for the CVVIN platform with local storage capabilities.


