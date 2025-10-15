# File Access Guide - CVVIN Platform

## 📁 How Files Are Stored and Accessed

### Storage Location
```
uploads/
├── users/
│   ├── {user_id}/
│   │   ├── {uuid}-{original_filename}.pdf
│   │   ├── {uuid}-{original_filename}.png
│   │   └── {uuid}-{original_filename}.jpg
```

### File Naming Convention
- **Format**: `{uuid}-{original_filename}`
- **Example**: `a1b2c3d4-e5f6-7890-abcd-ef1234567890-resume.pdf`
- **Benefits**: Prevents filename conflicts, ensures uniqueness

## 🔐 Secure File Access Methods

### 1. **API-Based File Access (Recommended)**

#### Get File URLs
```javascript
// Frontend usage
const fileUrls = await consolidatedAPI.getFileUrl(user, fileId);
console.log(fileUrls.downloadUrl); // For downloading
console.log(fileUrls.viewUrl);     // For viewing in browser
```

#### Download File
```javascript
// Download file as blob
const blob = await consolidatedAPI.downloadFile(user, fileId);

// Create download link
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'filename.pdf';
a.click();
```

#### View File in Browser
```javascript
// Get viewable URL
const viewUrl = await consolidatedAPI.viewFile(user, fileId);

// Use in iframe or new window
window.open(viewUrl, '_blank');
```

### 2. **Direct API Endpoints**

#### Download File
```
GET /api/files/{fileId}/download
Authorization: Bearer {firebase_token}
```
**Response**: File stream with appropriate headers

#### View File
```
GET /api/files/{fileId}/view
Authorization: Bearer {firebase_token}
```
**Response**: File stream with inline disposition

#### Get File URLs
```
GET /api/files/{fileId}/url
Authorization: Bearer {firebase_token}
```
**Response**:
```json
{
  "success": true,
  "data": {
    "fileId": "uuid",
    "fileName": "resume.pdf",
    "fileSize": 1024000,
    "mimeType": "application/pdf",
    "downloadUrl": "http://localhost:3000/api/files/uuid/download",
    "viewUrl": "http://localhost:3000/api/files/uuid/view",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

## 🛡️ Security Features

### Authentication Required
- All file access requires valid Firebase authentication
- User can only access their own files
- File ownership verified on every request

### File Validation
- File existence checked in database
- File existence verified on filesystem
- Proper error handling for missing files

### Access Control
- No direct filesystem access
- All access through authenticated API
- User isolation (users can't access other users' files)

## 📋 Usage Examples

### Frontend Component Example
```tsx
import { useState } from 'react';
import { consolidatedAPI } from '@/services/consolidatedAPI';
import { useAuth } from '@/contexts/AuthContext';

const FileViewer = ({ fileId, fileName }) => {
  const { currentUser } = useAuth();
  const [fileUrl, setFileUrl] = useState('');

  const handleViewFile = async () => {
    try {
      const url = await consolidatedAPI.viewFile(currentUser, fileId);
      setFileUrl(url);
    } catch (error) {
      console.error('Failed to load file:', error);
    }
  };

  const handleDownloadFile = async () => {
    try {
      const blob = await consolidatedAPI.downloadFile(currentUser, fileId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download file:', error);
    }
  };

  return (
    <div>
      <button onClick={handleViewFile}>View File</button>
      <button onClick={handleDownloadFile}>Download File</button>
      {fileUrl && (
        <iframe src={fileUrl} width="100%" height="600px" />
      )}
    </div>
  );
};
```

### Backend Service Example
```javascript
// Get file info
const fileInfo = await userService.getFileInfo(fileId, userId);

if (fileInfo.storageMethod === 'filesystem') {
  const filePath = path.join(process.cwd(), fileInfo.filePath);
  // Serve file from filesystem
} else {
  // Serve file from database (BYTEA)
}
```

## 🚨 Important Notes

### File Access Limitations
1. **Authentication Required**: All file access requires valid user authentication
2. **User Ownership**: Users can only access their own files
3. **File Existence**: Files must exist both in database and filesystem
4. **No Direct Access**: Direct filesystem URLs are disabled for security

### Error Handling
- **404**: File not found or user doesn't have access
- **401**: Authentication required
- **500**: Server error or file system issues

### Performance Considerations
- Files are streamed for large files
- Proper headers set for browser compatibility
- Database queries optimized with indexes

## 🔧 Troubleshooting

### Common Issues

1. **File Not Found (404)**
   - Check if file exists in database
   - Verify file exists on filesystem
   - Ensure user has access to file

2. **Authentication Error (401)**
   - Verify Firebase token is valid
   - Check if user is authenticated
   - Ensure token hasn't expired

3. **File Access Denied (403)**
   - Verify file belongs to requesting user
   - Check user permissions
   - Ensure file ownership is correct

### Debug Steps
1. Check database for file record
2. Verify filesystem file exists
3. Test authentication token
4. Check user permissions
5. Review server logs for errors

## 📊 File Management

### Supported File Types
- **Images**: PNG, JPG, JPEG
- **Documents**: PDF
- **Size Limit**: 10MB per file

### File Operations
- ✅ Upload files
- ✅ Download files
- ✅ View files in browser
- ✅ Get file metadata
- ✅ Delete files
- ✅ List user files

### Storage Methods
- **Filesystem**: Large files (>10MB) stored on disk
- **Database**: Small files (<10MB) stored as BYTEA (future implementation)
