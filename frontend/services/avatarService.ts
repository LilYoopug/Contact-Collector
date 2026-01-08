// frontend/services/avatarService.ts
// Story 8.2: Avatar Display in Profile
// HIGH-3 FIX: Dynamic API URL for proxy compatibility

import { User } from '../types';

// HIGH-3 FIX: Use environment variable or fallback to relative URL for proxy
const getApiBaseUrl = (): string => {
  // In development with Vite proxy, use relative path
  // In production, this should be configured via environment variable
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:8000/api';
  }
  return '/api';
};

export interface AvatarUploadError {
  message: string;
  errors?: Record<string, string[]>;
  status?: number;
}

const getAuthToken = (): string | null => {
  return localStorage.getItem('auth_token');
};

export const avatarService = {
  /**
   * Upload avatar image for current user
   * 
   * Story 8.2: Avatar Display in Profile
   * AC#3: Calls POST /api/user/avatar with FormData
   */
  async uploadAvatar(file: File): Promise<User> {
    const token = getAuthToken();
    if (!token) {
      throw { message: 'Not authenticated', status: 401 };
    }

    const formData = new FormData();
    formData.append('avatar', file);

    const response = await fetch(`${getApiBaseUrl()}/user/avatar`, {
      method: 'POST',
      headers: {
        // Note: Don't set Content-Type - browser sets it with boundary for FormData
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      // Handle validation errors (422)
      if (response.status === 422) {
        const errorMessage = data.errors?.avatar?.[0] || data.message || 'Invalid file';
        const error: AvatarUploadError = {
          message: errorMessage,
          errors: data.errors,
          status: response.status,
        };
        throw error;
      }

      // Handle other errors
      const error: AvatarUploadError = {
        message: data.message || 'Failed to upload avatar',
        status: response.status,
      };
      throw error;
    }

    // Return the updated user from API response
    // API returns UserResource format (camelCase)
    return data.data || data;
  },
};

export default avatarService;
