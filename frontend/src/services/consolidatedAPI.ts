import { User } from 'firebase/auth';

// API Configuration - Now using only Node.js backend
const BACKEND_BASE_URL = 'http://localhost:3000';

// Types for API responses
export interface FileUploadResponse {
  success: boolean;
  fileId: string;
  fileName: string;
  fileSize: number;
  message: string;
}

export interface UserProfile {
  id: string;
  firebase_uid: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  profileImageUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  preferences?: {
    targetRoles?: string[];
    [key: string]: any;
  };
  profile?: {
    resumeUrl?: string;
    resumeText?: string;
    skills: string[];
    experienceYears?: number;
    education: any[];
    certifications: any[];
    languages: any[];
    createdAt?: string;
    updatedAt?: string;
  };
  // Profile completion status
  isProfileComplete?: boolean;
  profileCompletionPercentage?: number;
  missingFields?: string[];
}

export interface ResumeData {
  resumeUrl: string;
  resumeText?: string;
  skills: string[];
  experienceYears?: number;
  education: any[];
  certifications: any[];
  languages: any[];
}

export interface AnalysisResult {
  overallScore: number;
  matchPercentage: number;
  processingTime: number;
  jobDescription: {
    title: string;
    requirements: string[];
    responsibilities: string[];
  };
  analysis: {
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
    skillMatch: {
      matched: string[];
      missing: string[];
    };
  };
}

class ConsolidatedAPI {
  private async getAuthHeaders(user: User): Promise<HeadersInit> {
    const token = await user.getIdToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  private async getAuthHeadersForFileUpload(user: User): Promise<HeadersInit> {
    const token = await user.getIdToken();
    return {
      'Authorization': `Bearer ${token}`,
    };
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || errorData.message || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  // Health check
  async checkHealth(): Promise<any> {
    const response = await fetch(`${BACKEND_BASE_URL}/health`);
    return this.handleResponse(response);
  }

  // User sync
  async syncUser(user: User): Promise<any> {
    const headers = await this.getAuthHeaders(user);
    const response = await fetch(`${BACKEND_BASE_URL}/api/users/sync`, {
      method: 'POST',
      headers,
    });
    return this.handleResponse(response);
  }

  // User Profile Management
  async getUserProfile(user: User): Promise<UserProfile> {
    const headers = await this.getAuthHeaders(user);
    const response = await fetch(`${BACKEND_BASE_URL}/api/users/profile`, {
      method: 'GET',
      headers,
    });
    
    // Handle 404 gracefully - return empty profile structure for new users
    if (response.status === 404) {
      return {
        id: '',
        firebase_uid: user.uid,
        email: user.email || '',
        firstName: user.displayName?.split(' ')[0] || null,
        lastName: user.displayName?.split(' ').slice(1).join(' ') || null,
        phone: null,
        profileImageUrl: user.photoURL || null,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        preferences: {
          targetRoles: []
        },
        profile: {
          resumeUrl: null,
          skills: [],
          education: [],
          certifications: [],
          languages: []
        },
        isProfileComplete: false,
        profileCompletionPercentage: 0,
        missingFields: []
      };
    }
    
    const result = await this.handleResponse<{ success: boolean; data: UserProfile }>(response);
    return result.data;
  }

  async getUserResumeData(user: User): Promise<ResumeData> {
    const headers = await this.getAuthHeaders(user);
    const response = await fetch(`${BACKEND_BASE_URL}/api/users/resume-data`, {
      method: 'GET',
      headers,
    });
    const result = await this.handleResponse<{ success: boolean; data: ResumeData }>(response);
    return result.data;
  }

  async updateUserProfile(user: User, profileData: Partial<UserProfile['profile']>): Promise<void> {
    const headers = await this.getAuthHeaders(user);
    const response = await fetch(`${BACKEND_BASE_URL}/api/users/profile`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(profileData),
    });
    await this.handleResponse(response);
  }

  // File Management
  async uploadFile(user: User, file: File): Promise<FileUploadResponse> {
    const headers = await this.getAuthHeadersForFileUpload(user);
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${BACKEND_BASE_URL}/api/users/files/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });
    return this.handleResponse<FileUploadResponse>(response);
  }

  async getUserFiles(user: User, fileType?: string): Promise<any[]> {
    const headers = await this.getAuthHeaders(user);
    let url = `${BACKEND_BASE_URL}/api/users/files`;
    if (fileType) {
      url += `?type=${fileType}`;
    }
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers,
      });
      
      // If user has no files, return empty array instead of error
      if (response.status === 404) {
        return [];
      }
      
      const result = await this.handleResponse<{ success: boolean; data: any[] }>(response);
      return result.data || [];
    } catch (error) {
      // Return empty array for new users or users with no files
      console.warn('Failed to get user files, returning empty array:', error);
      return [];
    }
  }

  // Check profile completion status
  async getProfileCompletionStatus(user: User): Promise<{
    isComplete: boolean;
    percentage: number;
    missingFields: string[];
  }> {
    const headers = await this.getAuthHeaders(user);
    const response = await fetch(`${BACKEND_BASE_URL}/api/users/profile/completion`, {
      method: 'GET',
      headers,
    });
    const result = await this.handleResponse<{ 
      success: boolean; 
      data: { isComplete: boolean; percentage: number; missingFields: string[] } 
    }>(response);
    return result.data;
  }

  // Get profile image file info
  // This should never throw - always returns null if no image exists (seamless for new users)
  async getProfileImageFile(user: User): Promise<any | null> {
    try {
      const files = await this.getUserFiles(user, 'profile_image').catch(() => []);
      return files.length > 0 ? files[0] : null;
    } catch (error) {
      // Silently return null - profile image is optional
      return null;
    }
  }

  // Get resume file info
  // This should never throw - always returns null if no resume exists (seamless for new users)
  async getResumeFile(user: User): Promise<any | null> {
    try {
      const files = await this.getUserFiles(user, 'resume_pdf').catch(() => []);
      return files.length > 0 ? files[0] : null;
    } catch (error) {
      // Silently return null - resume is optional
      return null;
    }
  }

  async getFileInfo(user: User, fileId: string): Promise<any> {
    const headers = await this.getAuthHeaders(user);
    const response = await fetch(`${BACKEND_BASE_URL}/api/users/files/${fileId}`, {
      method: 'GET',
      headers,
    });
    const result = await this.handleResponse<{ success: boolean; data: any }>(response);
    return result.data;
  }

  async downloadFile(user: User, fileId: string): Promise<Blob> {
    const headers = await this.getAuthHeaders(user);
    const response = await fetch(`${BACKEND_BASE_URL}/api/files/${fileId}/download`, {
      method: 'GET',
      headers,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || errorData.message || `HTTP error! status: ${response.status}`);
    }
    
    return response.blob();
  }

  async getFileUrl(user: User, fileId: string): Promise<{ downloadUrl: string; viewUrl: string }> {
    const headers = await this.getAuthHeaders(user);
    const response = await fetch(`${BACKEND_BASE_URL}/api/files/${fileId}/url`, {
      method: 'GET',
      headers,
    });
    const result = await this.handleResponse<{ success: boolean; data: { downloadUrl: string; viewUrl: string } }>(response);
    return result.data;
  }

  async viewFile(user: User, fileId: string): Promise<string> {
    const headers = await this.getAuthHeaders(user);
    const response = await fetch(`${BACKEND_BASE_URL}/api/files/${fileId}/view`, {
      method: 'GET',
      headers,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || errorData.message || `HTTP error! status: ${response.status}`);
    }
    
    // Return the URL for viewing
    return `${BACKEND_BASE_URL}/api/files/${fileId}/view`;
  }

  async deleteFile(user: User, fileId: string): Promise<void> {
    const headers = await this.getAuthHeaders(user);
    const response = await fetch(`${BACKEND_BASE_URL}/api/users/files/${fileId}`, {
      method: 'DELETE',
      headers,
    });
    await this.handleResponse(response);
  }

  // Profile Image Upload
  async uploadProfileImage(user: User, imageFile: File): Promise<{ imageUrl: string }> {
    const headers = await this.getAuthHeadersForFileUpload(user);
    
    const formData = new FormData();
    formData.append('image', imageFile);
    
    const response = await fetch(`${BACKEND_BASE_URL}/api/users/profile/image`, {
      method: 'POST',
      headers,
      body: formData,
    });
    
    return this.handleResponse(response);
  }

  // Image-specific methods
  async getImageUrl(user: User, fileId: string, options?: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'jpeg' | 'png';
  }): Promise<string> {
    const headers = await this.getAuthHeaders(user);
    
    let url = `${BACKEND_BASE_URL}/api/images/${fileId}`;
    const params = new URLSearchParams();
    
    if (options?.width) params.append('w', options.width.toString());
    if (options?.height) params.append('h', options.height.toString());
    if (options?.quality) params.append('q', options.quality.toString());
    if (options?.format) params.append('format', options.format);
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    return url;
  }

  async getImageThumbnail(user: User, fileId: string, size: number = 150): Promise<string> {
    const headers = await this.getAuthHeaders(user);
    return `${BACKEND_BASE_URL}/api/images/${fileId}/thumbnail?size=${size}`;
  }

  async getImageInfo(user: User, fileId: string): Promise<{
    fileId: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    metadata: {
      width: number;
      height: number;
      format: string;
      channels: number;
      hasAlpha: boolean;
    };
    urls: {
      original: string;
      thumbnail: string;
      resized: (w: number, h: number) => string;
      optimized: (format: string, quality: number) => string;
    };
  }> {
    const headers = await this.getAuthHeaders(user);
    const response = await fetch(`${BACKEND_BASE_URL}/api/images/${fileId}/info`, {
      method: 'GET',
      headers,
    });
    const result = await this.handleResponse<{ success: boolean; data: any }>(response);
    return result.data;
  }

  // Resume Analysis (placeholder for future implementation)
  async analyzeResume(user: User, fileId: string, jobDescription: string): Promise<AnalysisResult> {
    // For now, return mock data. This can be implemented later with actual analysis logic
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          overallScore: 85,
          matchPercentage: 78,
          processingTime: 2.5,
          jobDescription: {
            title: "Software Engineer",
            requirements: jobDescription.split('\n').filter(line => line.trim()),
            responsibilities: []
          },
          analysis: {
            strengths: [
              "Strong technical skills in JavaScript and React",
              "Experience with modern development tools",
              "Good problem-solving abilities"
            ],
            weaknesses: [
              "Limited experience with backend technologies",
              "Could improve testing knowledge"
            ],
            recommendations: [
              "Consider learning Node.js and Express",
              "Practice writing unit tests",
              "Build more full-stack projects"
            ],
            skillMatch: {
              matched: ["JavaScript", "React", "Git"],
              missing: ["Node.js", "Python", "Docker"]
            }
          }
        });
      }, 2000);
    });
  }
}

export const consolidatedAPI = new ConsolidatedAPI();
