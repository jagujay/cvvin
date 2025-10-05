from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID

# File schemas
class FileUploadResponse(BaseModel):
    file_id: str
    file_name: str
    content_type: str
    size: int
    storage_method: str
    checksum: str
    is_duplicate: bool = False

class FileInfo(BaseModel):
    id: str
    file_name: str
    file_type: str
    file_size: int
    storage_method: str
    mime_type: Optional[str]
    upload_date: datetime
    checksum: Optional[str]

# Analysis schemas
class AnalysisRequest(BaseModel):
    file_id: str
    job_description: str

class SkillAnalysis(BaseModel):
    required_skills: List[str]
    candidate_skills: List[str]
    matched_skills: List[str]
    missing_skills: List[str]
    skill_summary: str
    skill_relevance_score: Optional[int] = None

class ExperienceAnalysis(BaseModel):
    required_years: str
    candidate_years: str
    alignment: str
    calculation_methodology: str
    experience_summary: str
    role_relevance_score: Optional[int] = None

class Strength(BaseModel):
    strength: str
    evidence: str
    relevance: Optional[str] = None

class Gap(BaseModel):
    gap: str
    evidence: str
    impact: Optional[str] = None

class Suggestion(BaseModel):
    category: Optional[str] = None
    suggestion: str
    priority: Optional[str] = None
    timeline: Optional[str] = None

class ATSCompliance(BaseModel):
    is_compliant: bool
    score: int
    issues: List[str]
    suggestions: List[str]
    metric_definitions: str
    keyword_optimization: Optional[Dict[str, Any]] = None

class AnalysisResponse(BaseModel):
    id: str
    overall_score: int
    summary: str
    skill_analysis: SkillAnalysis
    experience_analysis: ExperienceAnalysis
    strengths: List[Strength]
    gaps: List[Gap]
    suggestions: List[str]
    ats_compliance: ATSCompliance
    created_at: datetime

class AnalysisHistory(BaseModel):
    id: str
    file_id: str
    overall_score: int
    job_description: str
    created_at: datetime

# Health check schema
class HealthResponse(BaseModel):
    status: str
    timestamp: datetime
    version: str = "1.0.0"
    services: Dict[str, str]


