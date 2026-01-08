// frontend/services/apiKeyService.ts
// Story 7.3: API Key List and View
// Story 7.2, 7.5, 7.6: API Key CRUD operations

import { authService } from './authService';

// API Configuration - uses environment variable with fallback for development
// @ts-ignore - Vite provides import.meta.env at runtime
const API_BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:8000/api';

/**
 * API Key interface for list/view operations
 */
export interface ApiKey {
  id: string;
  name: string;
  maskedKey: string;
  lastUsedAt: string | null;
  createdAt: string;
}

/**
 * API Key with plaintext (only returned on creation/regeneration)
 */
export interface ApiKeyWithPlaintext extends ApiKey {
  key: string;
}

/**
 * Response format for API key creation/regeneration
 */
export interface ApiKeyCreateResponse {
  data: ApiKeyWithPlaintext;
  message: string;
}

/**
 * Response format for API key list
 */
export interface ApiKeyListResponse {
  data: ApiKey[];
}

const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
};

export const apiKeyService = {
  /**
   * Get all active API keys for the current user
   * Story 7.3: API Key List and View
   */
  async getAll(): Promise<ApiKey[]> {
    const response = await authService.authenticatedFetch(`${API_BASE_URL}/api-keys`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch API keys');
    }

    const result: ApiKeyListResponse = await response.json();
    return result.data;
  },

  /**
   * Create a new API key
   * Story 7.2: API Key Generation Endpoint
   * Returns plaintext key ONCE - user must save it
   */
  async create(name?: string): Promise<ApiKeyWithPlaintext> {
    const response = await authService.authenticatedFetch(`${API_BASE_URL}/api-keys`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ name: name || 'Default' }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw {
        message: error.message || 'Failed to create API key',
        errors: error.errors,
      };
    }

    const result: ApiKeyCreateResponse = await response.json();
    return result.data;
  },

  /**
   * Regenerate an existing API key
   * Story 7.5: Regenerate API Key
   * Revokes old key and creates new one with same name
   */
  async regenerate(id: string): Promise<ApiKeyWithPlaintext> {
    const response = await authService.authenticatedFetch(`${API_BASE_URL}/api-keys/${id}/regenerate`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to regenerate API key');
    }

    const result: ApiKeyCreateResponse = await response.json();
    return result.data;
  },

  /**
   * Revoke (soft delete) an API key
   * Story 7.6: Revoke API Key
   */
  async revoke(id: string): Promise<void> {
    const response = await authService.authenticatedFetch(`${API_BASE_URL}/api-keys/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    // 204 No Content is success
    if (!response.ok && response.status !== 204) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to revoke API key');
    }
  },
};

export default apiKeyService;
