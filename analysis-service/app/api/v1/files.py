from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import Response, FileResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.file_service import LocalFileService
from app.schemas import FileUploadResponse, FileInfo
import os

router = APIRouter()

@router.post("/upload", response_model=FileUploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload file for analysis"""
    try:
        # Validate file type
        if not file.filename.endswith('.pdf'):
            raise HTTPException(
                status_code=400, 
                detail="Only PDF files are supported"
            )
        
        # Read file content
        file_content = await file.read()
        
        # Initialize file service
        file_service = LocalFileService(db)
        
        # Upload file (using a dummy user_id for now)
        upload_result = await file_service.upload_file(
            file_content=file_content,
            file_name=file.filename,
            content_type=file.content_type,
            user_id="temp-user-id"  # We'll implement proper auth later
        )
        
        return FileUploadResponse(**upload_result)
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Upload failed: {str(e)}"
        )

@router.get("/{file_id}/download")
async def download_file(
    file_id: str,
    db: Session = Depends(get_db)
):
    """Download file"""
    try:
        file_service = LocalFileService(db)
        file_record = file_service.get_file(file_id)
        
        if not file_record:
            raise HTTPException(status_code=404, detail="File not found")
        
        if file_record.storage_method == 'database':
            # Serve from database
            return Response(
                content=file_record.file_data,
                media_type=file_record.mime_type,
                headers={"Content-Disposition": f"attachment; filename={file_record.file_name}"}
            )
        else:
            # Serve from filesystem
            if not os.path.exists(file_record.file_path):
                raise HTTPException(status_code=404, detail="File not found on disk")
            
            return FileResponse(
                path=file_record.file_path,
                filename=file_record.file_name,
                media_type=file_record.mime_type
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Download failed: {str(e)}"
        )

@router.get("/{file_id}/info", response_model=FileInfo)
async def get_file_info(
    file_id: str,
    db: Session = Depends(get_db)
):
    """Get file information"""
    try:
        file_service = LocalFileService(db)
        file_record = file_service.get_file(file_id)
        
        if not file_record:
            raise HTTPException(status_code=404, detail="File not found")
        
        return FileInfo(
            id=str(file_record.id),
            file_name=file_record.file_name,
            file_type=file_record.file_type,
            file_size=file_record.file_size,
            storage_method=file_record.storage_method,
            mime_type=file_record.mime_type,
            upload_date=file_record.upload_date,
            checksum=file_record.checksum
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get file info: {str(e)}"
        )

@router.delete("/{file_id}")
async def delete_file(
    file_id: str,
    db: Session = Depends(get_db)
):
    """Delete file"""
    try:
        file_service = LocalFileService(db)
        file_record = file_service.get_file(file_id)
        
        if not file_record:
            raise HTTPException(status_code=404, detail="File not found")
        
        success = file_service.delete_file(file_id)
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to delete file")
        
        return {"message": "File deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Delete failed: {str(e)}"
        )


