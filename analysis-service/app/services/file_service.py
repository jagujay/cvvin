import os
import uuid
import hashlib
import fitz
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.logging import logger
from app.core.exceptions import FileProcessingError
from app.models import File

class LocalFileService:
    def __init__(self, db: Session):
        self.db = db
        self.upload_dir = settings.upload_dir
        self.max_db_size = settings.max_db_file_size
        self.max_file_size = settings.max_file_size
        
        # Ensure upload directory exists
        os.makedirs(self.upload_dir, exist_ok=True)
        os.makedirs(os.path.join(self.upload_dir, 'users'), exist_ok=True)
        os.makedirs(os.path.join(self.upload_dir, 'temp'), exist_ok=True)
        os.makedirs(os.path.join(self.upload_dir, 'backups'), exist_ok=True)
    
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
            
            # Check for duplicate files
            existing_file = self.db.query(File).filter(
                File.checksum == file_hash,
                File.user_id == user_id
            ).first()
            
            if existing_file:
                logger.info(f"Duplicate file found: {file_name}")
                return {
                    'file_id': str(existing_file.id),
                    'file_name': file_name,
                    'content_type': content_type,
                    'size': file_size,
                    'storage_method': existing_file.storage_method,
                    'checksum': file_hash,
                    'is_duplicate': True
                }
            
            # Choose storage method based on file size
            if file_size <= self.max_db_size:
                file_record = await self._store_in_database(
                    file_content, file_name, content_type, user_id, file_hash
                )
                storage_method = 'database'
            else:
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
                'checksum': file_hash,
                'is_duplicate': False
            }
            
        except Exception as e:
            logger.error(f"File upload failed: {e}")
            raise FileProcessingError(f"Upload failed: {str(e)}")
    
    def _validate_file(self, file_content: bytes, file_name: str) -> bool:
        """Validate file type and size"""
        # Check file size
        if len(file_content) > self.max_file_size:
            logger.warning(f"File too large: {len(file_content)} bytes")
            return False
        
        # Check file extension
        allowed_extensions = ['.pdf', '.png', '.jpg', '.jpeg']
        if not any(file_name.lower().endswith(ext) for ext in allowed_extensions):
            logger.warning(f"Invalid file extension: {file_name}")
            return False
        
        # Check file signature
        if not self._validate_file_signature(file_content):
            logger.warning(f"Invalid file signature: {file_name}")
            return False
        
        return True
    
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
        self.db.refresh(file_record)
        
        logger.info(f"File stored in database: {file_name} ({len(file_content)} bytes)")
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
        safe_filename = self._sanitize_filename(file_name)
        file_path = os.path.join(user_dir, f"{file_id}_{safe_filename}")
        
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
        self.db.refresh(file_record)
        
        logger.info(f"File stored on filesystem: {file_name} ({len(file_content)} bytes)")
        return file_record
    
    def _sanitize_filename(self, filename: str) -> str:
        """Sanitize filename for filesystem storage"""
        import re
        # Remove or replace invalid characters
        filename = re.sub(r'[<>:"/\\|?*]', '_', filename)
        # Limit length
        if len(filename) > 255:
            name, ext = os.path.splitext(filename)
            filename = name[:255-len(ext)] + ext
        return filename
    
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
            
            logger.info(f"Text extracted from PDF: {file_record.file_name}")
            return text.strip()
            
        except Exception as e:
            logger.error(f"PDF text extraction failed: {e}")
            raise FileProcessingError(f"Text extraction failed: {str(e)}")
    
    def get_file(self, file_id: str) -> Optional[File]:
        """Get file record by ID"""
        return self.db.query(File).filter(File.id == file_id).first()
    
    def delete_file(self, file_id: str) -> bool:
        """Delete file and its storage"""
        try:
            file_record = self.db.query(File).filter(File.id == file_id).first()
            if not file_record:
                return False
            
            # Delete from filesystem if applicable
            if file_record.storage_method == 'filesystem' and file_record.file_path:
                if os.path.exists(file_record.file_path):
                    os.remove(file_record.file_path)
            
            # Delete from database
            self.db.delete(file_record)
            self.db.commit()
            
            logger.info(f"File deleted: {file_record.file_name}")
            return True
            
        except Exception as e:
            logger.error(f"File deletion failed: {e}")
            self.db.rollback()
            return False


