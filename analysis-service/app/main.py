from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import create_tables, test_connection
from app.core.logging import logger
from app.api.v1 import analysis, files, health

# Create FastAPI app
app = FastAPI(
    title="CVVIN Analysis Service",
    description="LLM-powered resume analysis and interview preparation",
    version="1.0.0",
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
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
    logger.info("Starting CVVIN Analysis Service...")
    
    # Test database connection
    if test_connection():
        logger.info("Database connection successful")
        create_tables()
    else:
        logger.error("Database connection failed")
        raise Exception("Cannot start service without database connection")
    
    logger.info("CVVIN Analysis Service started successfully")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("CVVIN Analysis Service stopped")

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "CVVIN Analysis Service",
        "version": "1.0.0",
        "status": "running"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8001,
        reload=settings.debug,
        log_level=settings.log_level.lower()
    )


