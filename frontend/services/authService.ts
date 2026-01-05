// frontend/services/authService.ts

const API_BASE_URL = 'http://localhost:8000/api';

// Event system for 401 handling
type AuthEventCallback = (reason?: string) => void;
let onUnauthorizedCallback: AuthEventCallback | null = null;

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  avatar_url: string | null;
  created_at: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface AuthError {
  message: string;
  errors?: Record<string, string[]>;
  status?: number;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  phone?: string;
}

const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
};

export const authService = {
  /**
   * Register a new user
   */
  async register(name: string, email: string, password: string, phone?: string): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/register`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        name,
        email,
        password,
        password_confirmation: password,
        phone,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const error: AuthError = {
        message: data.message || 'Registration failed',
        errors: data.errors,
        status: response.status,
      };
      throw error;
    }

    // Store token in localStorage
    if (data.token) {
      localStorage.setItem('auth_token', data.token);
    }

    return data;
  },

  /**
   * Login user with email and password
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      const error: AuthError = {
        message: data.message || 'Login failed',
        errors: data.errors,
        status: response.status,
      };
      throw error;
    }

    // Store token in localStorage
    if (data.token) {
      localStorage.setItem('auth_token', data.token);
    }

    return data;
  },

  /**
   * Logout the current user
   */
  async logout(): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/logout`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
    } finally {
      // Always clear token regardless of API response
      localStorage.removeItem('auth_token');
    }
  },

  /**
   * Get current authenticated user
   * Uses authenticatedFetch for proper 401 handling
   */
  async getCurrentUser(): Promise<User> {
    const response = await this.authenticatedFetch(`${API_BASE_URL}/user`);

    if (!response.ok) {
      const error: AuthError = {
        message: 'Failed to get user',
        status: response.status,
      };
      throw error;
    }

    return response.json();
  },

  /**
   * Check if user is authenticated (has valid token)
   */
  isAuthenticated(): boolean {
    return !!localStorage.getItem('auth_token');
  },

  /**
   * Get stored auth token
   */
  getToken(): string | null {
    return localStorage.getItem('auth_token');
  },

  /**
   * Clear stored auth token
   */
  clearToken(): void {
    localStorage.removeItem('auth_token');
  },

  /**
   * Set callback for unauthorized (401) events
   */
  onUnauthorized(callback: AuthEventCallback): void {
    onUnauthorizedCallback = callback;
  },

  /**
   * Handle 401 response - clears token and notifies callback
   */
  handleUnauthorized(reason: string = 'Session expired'): void {
    localStorage.removeItem('auth_token');
    if (onUnauthorizedCallback) {
      onUnauthorizedCallback(reason);
    }
  },

  /**
   * Fetch wrapper with automatic 401 handling
   */
  async authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...getAuthHeaders(),
        ...options.headers,
      },
    });

    if (response.status === 401) {
      this.handleUnauthorized('Session expired. Please login again.');
      throw { status: 401, message: 'Unauthorized' };
    }

    return response;
  },
};

export default authService;
