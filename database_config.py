# Database Configuration for CVVIN Platform
# Update these values according to your PostgreSQL setup

# Database connection details
DATABASE_HOST = "localhost"
DATABASE_PORT = 5432
DATABASE_NAME = "cvvin"
DATABASE_USER = "postgres"  # Change this to your PostgreSQL username
DATABASE_PASSWORD = "jagujay"  # Change this to your PostgreSQL password

# Construct the database URL
DATABASE_URL = f"postgresql://{DATABASE_USER}:{DATABASE_PASSWORD}@{DATABASE_HOST}:{DATABASE_PORT}/{DATABASE_NAME}"

# File storage configuration
UPLOAD_DIR = "uploads"
MAX_DB_FILE_SIZE = 10485760  # 10MB
MAX_FILE_SIZE = 52428800      # 50MB

# Ollama configuration
OLLAMA_HOST = "http://localhost:11434"
OLLAMA_MODEL = "resume-analyzer"

# Security
SECRET_KEY = "your-secret-key-change-this-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Logging
LOG_LEVEL = "INFO"
LOG_FORMAT = "json"

print(f"Database URL: {DATABASE_URL}")
print(f"Upload directory: {UPLOAD_DIR}")
print(f"Max DB file size: {MAX_DB_FILE_SIZE / (1024*1024):.1f}MB")
print(f"Max file size: {MAX_FILE_SIZE / (1024*1024):.1f}MB")


