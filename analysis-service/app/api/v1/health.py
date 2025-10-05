from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db, test_connection
from app.core.config import settings
from app.schemas import HealthResponse
from datetime import datetime

router = APIRouter()

@router.get("/", response_model=HealthResponse)
async def health_check(db: Session = Depends(get_db)):
    """Health check endpoint"""
    services = {
        "database": "healthy" if test_connection() else "unhealthy",
        "ollama": "unknown",  # We'll implement Ollama health check later
        "file_storage": "healthy"  # Local storage is always available
    }
    
    overall_status = "healthy" if all(
        status == "healthy" for status in services.values()
    ) else "degraded"
    
    return HealthResponse(
        status=overall_status,
        timestamp=datetime.now(),
        services=services
    )

@router.get("/ready")
async def readiness_check():
    """Readiness check for Kubernetes"""
    if test_connection():
        return {"status": "ready"}
    else:
        return {"status": "not ready"}, 503

@router.get("/live")
async def liveness_check():
    """Liveness check for Kubernetes"""
    return {"status": "alive"}


