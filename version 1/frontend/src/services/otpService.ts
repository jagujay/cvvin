const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export interface SendOTPResponse {
  success: boolean;
  message: string;
  otpId?: string; // For testing purposes
}

export interface VerifyOTPResponse {
  success: boolean;
  message: string;
}

export interface SendOTPRequest {
  email: string;
  type?: 'verification' | 'reset';
}

export interface VerifyOTPRequest {
  email: string;
  otp: string;
  otpId?: string;
  type?: 'verification' | 'reset';
}

export interface ResetPasswordRequest {
  email: string;
  newPassword: string;
}

export interface ResetPasswordResponse {
  success: boolean;
  message: string;
}

class OTPService {
  private async makeRequest<T>(
    endpoint: string, 
    method: 'GET' | 'POST' = 'GET', 
    body?: any
  ): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async sendOTP(data: SendOTPRequest): Promise<SendOTPResponse> {
    return this.makeRequest<SendOTPResponse>('/api/send-otp', 'POST', data);
  }

  async verifyOTP(data: VerifyOTPRequest): Promise<VerifyOTPResponse> {
    return this.makeRequest<VerifyOTPResponse>('/api/verify-otp', 'POST', data);
  }

  async resetPassword(data: ResetPasswordRequest): Promise<ResetPasswordResponse> {
    return this.makeRequest<ResetPasswordResponse>('/api/reset-password', 'POST', data);
  }

  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.makeRequest<{ status: string; timestamp: string }>('/health');
  }
}

export const otpService = new OTPService();
