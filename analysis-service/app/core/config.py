from pydantic_settings import BaseSettings
from typing import List
import os

class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql://postgres:password@localhost:5432/cvvin"
    
    # File Storage
    upload_dir: str = "uploads"
    max_db_file_size: int = 10485760  # 10MB
    max_file_size: int = 52428800     # 50MB
    
    # Ollama
    ollama_host: str = "http://localhost:11434"
    ollama_model: str = "resume-analyzer"
    
    # Security
    secret_key: str = "your-secret-key-change-this-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    # Logging
    log_level: str = "INFO"
    log_format: str = "json"
    
    # CORS
    allowed_origins: List[str] = ["http://localhost:8080", "http://localhost:3000"]
    
    # Development
    debug: bool = True
    environment: str = "development"
    
    class Config:
        env_file = ".env"
        case_sensitive = False

# Create settings instance
settings = Settings()

# Ensure upload directories exist
os.makedirs(settings.upload_dir, exist_ok=True)
os.makedirs(os.path.join(settings.upload_dir, 'users'), exist_ok=True)
os.makedirs(os.path.join(settings.upload_dir, 'temp'), exist_ok=True)
os.makedirs(os.path.join(settings.upload_dir, 'backups'), exist_ok=True)


