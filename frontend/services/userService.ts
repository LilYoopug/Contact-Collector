// frontend/services/userService.ts

import { User, CreateUserData, UpdateUserData, DashboardStats, UserRole } from '../types';

const API_BASE_URL = 'http://localhost:8000/api';

export interface ServiceError {
  message: string;
  status: number;
  errors?: Record<string, string[]>;
}

const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
};

/**
 * Handle API response with proper error handling
 */
const handleResponse = async <T>(response: Response): Promise<T> => {
  // Handle 401 Unauthorized - clear token and redirect
  if (response.status === 401) {
    localStorage.removeItem('auth_token');
    window.location.href = '/login';
    throw { status: 401, message: 'Session expired. Please login again.' } as ServiceError;
  }

  // Handle 403 Forbidden - access denied
  if (response.status === 403) {
    throw { status: 403, message: 'Access denied. Admin privileges required.' } as ServiceError;
  }

  // Handle 204 No Content (successful delete)
  if (response.status === 204) {
    return null as T;
  }

  // Handle validation errors (422)
  if (response.status === 422) {
    const data = await response.json();
    throw { 
      status: 422, 
      message: data.message || 'Validation failed',
      errors: data.errors 
    } as ServiceError;
  }

  // Handle other errors
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw { 
      status: response.status, 
      message: data.message || `Request failed with status ${response.status}` 
    } as ServiceError;
  }

  return response.json();
};

/**
 * Transform API user response to frontend User type
 * HIGH-3 FIX: Handle undefined fields properly - totalContacts and isActive not in API response
 */
const transformUser = (apiUser: any): User => ({
  id: apiUser.id,
  name: apiUser.name,
  email: apiUser.email,
  phone: apiUser.phone || null,
  role: apiUser.role === 'admin' ? UserRole.ADMIN : UserRole.USER,
  avatarUrl: apiUser.avatarUrl || null,
  createdAt: apiUser.createdAt,
  updatedAt: apiUser.updatedAt,
  lastLoginAt: apiUser.lastLoginAt || null,
  // These fields are optional and may not be in the API response
  totalContacts: apiUser.totalContacts ?? 0,
  isActive: apiUser.isActive ?? true,
});

export const userService = {
  /**
   * Get all users (admin only)
   * AC: #1 - getAll method
   */
  async getAll(): Promise<User[]> {
    const response = await fetch(`${API_BASE_URL}/users`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    const data = await handleResponse<{ data: any[] }>(response);
    return data.data.map(transformUser);
  },

  /**
   * Create a new user (admin only)
   * AC: #1 - create method
   */
  async create(userData: CreateUserData): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        name: userData.name,
        email: userData.email,
        password: userData.password,
        role: userData.role,
        phone: userData.phone,
      }),
    });

    const data = await handleResponse<{ data: any }>(response);
    return transformUser(data.data);
  },

  /**
   * Update an existing user (admin only)
   * AC: #1 - update method
   */
  async update(id: string, userData: UpdateUserData): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/users/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        name: userData.name,
        email: userData.email,
        password: userData.password,
        role: userData.role,
        phone: userData.phone,
        is_active: userData.isActive,
      }),
    });

    const data = await handleResponse<{ data: any }>(response);
    return transformUser(data.data);
  },

  /**
   * Delete/deactivate a user (admin only)
   * AC: #1 - delete method
   */
  async delete(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/users/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    await handleResponse<null>(response);
  },

  /**
   * Get admin dashboard statistics
   * AC: #1 - getStats method
   * FIX: Changed endpoint from /admin/stats to /dashboard/stats to match backend route
   */
  async getStats(): Promise<DashboardStats> {
    const response = await fetch(`${API_BASE_URL}/dashboard/stats`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    const data = await handleResponse<{ data: any }>(response);
    return {
      totalUsers: data.data.totalUsers ?? 0,
      activeUsersThisMonth: data.data.activeUsersThisMonth ?? 0,
      totalContacts: data.data.totalContacts ?? 0,
      contactsThisWeek: data.data.contactsThisWeek ?? 0,
    };
  },

  /**
   * Get a single user by ID (admin only)
   */
  async getById(id: string): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/users/${id}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    const data = await handleResponse<{ data: any }>(response);
    return transformUser(data.data);
  },
};

export default userService;
