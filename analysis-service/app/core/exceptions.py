class CVVINException(Exception):
    """Base exception for CVVIN platform"""
    pass

class FileProcessingError(CVVINException):
    """Exception raised for file processing errors"""
    pass

class AnalysisError(CVVINException):
    """Exception raised for analysis errors"""
    pass

class DatabaseError(CVVINException):
    """Exception raised for database errors"""
    pass

class AuthenticationError(CVVINException):
    """Exception raised for authentication errors"""
    pass

class ValidationError(CVVINException):
    """Exception raised for validation errors"""
    pass


