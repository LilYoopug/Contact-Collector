import { Contact, Source, ConsentStatus } from '../types';

// API Configuration - uses environment variable with fallback for development
// @ts-ignore - Vite provides import.meta.env at runtime
const API_BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:8000/api';

// Type Definitions
export interface CreateContact {
  fullName: string;
  phone: string;
  email?: string;
  company?: string;
  jobTitle?: string;
  source?: Source;
  consent?: ConsentStatus;
}

export interface UpdateContact {
  fullName?: string;
  phone?: string;
  email?: string | null;
  company?: string | null;
  jobTitle?: string | null;
  source?: Source;
  consent?: ConsentStatus;
}

export interface ContactListParams {
  page?: number;
  perPage?: number;
  search?: string;
  source?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface PaginationMeta {
  currentPage: number;
  from: number | null;
  lastPage: number;
  perPage: number;
  to: number | null;
  total: number;
}

export interface ContactListResponse {
  data: Contact[];
  meta: PaginationMeta;
}

// API Error interface for type-safe error handling
export interface ApiError {
  status: number;
  message: string;
  errors?: Record<string, string[]>;
}

// Batch Create Result interface
export interface BatchCreateResult {
  created: Contact[];
  duplicates: Array<{
    input: CreateContact;
    existing?: Contact;
  }>;
  errors: Array<{
    input: CreateContact;
    message: string;
    validationErrors?: Record<string, string[]>;
  }>;
}

// Helper Functions
const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
};

const handleResponse = async <T>(response: Response): Promise<T> => {
  if (response.status === 401) {
    localStorage.removeItem('auth_token');
    window.location.href = '/login';
    const error: ApiError = { status: 401, message: 'Session expired. Please login again.' };
    throw error;
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: ApiError = {
      status: response.status,
      message: errorData.message || 'An error occurred',
      errors: errorData.errors || {},
    };
    throw error;
  }

  // Handle 204 No Content (for delete)
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
};

// Transform API response dates to Date objects
const transformContact = (contact: any): Contact => ({
  ...contact,
  createdAt: new Date(contact.createdAt),
  updatedAt: contact.updatedAt ? new Date(contact.updatedAt) : undefined,
});

// Service Methods
export const contactService = {
  /**
   * Get paginated list of contacts
   */
  async getAll(params?: ContactListParams): Promise<ContactListResponse> {
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.perPage) queryParams.append('per_page', params.perPage.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.source && params.source !== 'all') queryParams.append('source', params.source);
    if (params?.dateFrom) queryParams.append('date_from', params.dateFrom);
    if (params?.dateTo) queryParams.append('date_to', params.dateTo);
    
    const url = `${API_BASE_URL}/contacts${queryParams.toString() ? `?${queryParams}` : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    const result = await handleResponse<any>(response);
    
    return {
      data: result.data.map(transformContact),
      meta: {
        currentPage: result.meta.current_page,
        from: result.meta.from,
        lastPage: result.meta.last_page,
        perPage: result.meta.per_page,
        to: result.meta.to,
        total: result.meta.total,
      },
    };
  },

  /**
   * Get a single contact by ID
   */
  async getById(id: string): Promise<Contact> {
    const response = await fetch(`${API_BASE_URL}/contacts/${id}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    const result = await handleResponse<{ data: any }>(response);
    return transformContact(result.data);
  },

  /**
   * Create a new contact
   */
  async create(data: CreateContact): Promise<Contact> {
    const response = await fetch(`${API_BASE_URL}/contacts`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        full_name: data.fullName,
        phone: data.phone,
        email: data.email || null,
        company: data.company || null,
        job_title: data.jobTitle || null,
        source: data.source || 'manual',
        consent: data.consent || 'unknown',
      }),
    });

    const result = await handleResponse<{ data: any }>(response);
    return transformContact(result.data);
  },

  /**
   * Update an existing contact
   */
  async update(id: string, data: UpdateContact): Promise<Contact> {
    const body: Record<string, any> = {};
    
    if (data.fullName !== undefined) body.full_name = data.fullName;
    if (data.phone !== undefined) body.phone = data.phone;
    if (data.email !== undefined) body.email = data.email;
    if (data.company !== undefined) body.company = data.company;
    if (data.jobTitle !== undefined) body.job_title = data.jobTitle;
    if (data.source !== undefined) body.source = data.source;
    if (data.consent !== undefined) body.consent = data.consent;

    const response = await fetch(`${API_BASE_URL}/contacts/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(body),
    });

    const result = await handleResponse<{ data: any }>(response);
    return transformContact(result.data);
  },

  /**
   * Delete a contact
   */
  async delete(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/contacts/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    await handleResponse<void>(response);
  },

  /**
   * Update multiple contacts at once (batch update)
   * @param ids - Array of contact IDs to update
   * @param updates - Object with fields to update (company, job_title, consent)
   * @returns Array of updated contacts
   */
  async updateBatch(ids: string[], updates: {
    company?: string;
    job_title?: string;
    consent?: 'opt_in' | 'opt_out' | 'unknown';
  }): Promise<Contact[]> {
    const response = await fetch(`${API_BASE_URL}/contacts/batch`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ ids, updates }),
    });

    const result = await handleResponse<{ data: any[] }>(response);
    return result.data.map(transformContact);
  },

  /**
   * Delete multiple contacts at once (batch delete)
   * @param ids - Array of contact IDs to delete
   */
  async deleteBatch(ids: string[]): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/contacts/batch`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      body: JSON.stringify({ ids }),
    });

    await handleResponse<void>(response);
  },

  /**
   * Create multiple contacts at once (batch create)
   * @param contacts - Array of contacts to create
   * @returns BatchCreateResult with created, duplicates, and errors
   */
  async createBatch(contacts: CreateContact[]): Promise<BatchCreateResult> {
    // Backend expects camelCase - keep as-is
    const apiContacts = contacts.map(c => ({
      fullName: c.fullName,
      phone: c.phone,
      email: c.email || null,
      company: c.company || null,
      jobTitle: c.jobTitle || null,
      source: c.source || 'ocr_list',
      consent: c.consent || 'unknown',
    }));

    const response = await fetch(`${API_BASE_URL}/contacts/batch`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ contacts: apiContacts }),
    });

    // Handle 207 Multi-Status (partial success) - this is still a valid response
    if (response.status === 207 || response.ok) {
      const result = await response.json();
      
      // Transform API response to frontend format
      // Backend returns input in camelCase, existing as ContactResource
      return {
        created: (result.created || []).map(transformContact),
        duplicates: (result.duplicates || []).map((d: any) => ({
          input: {
            fullName: d.input?.fullName || '',
            phone: d.input?.phone || '',
            email: d.input?.email,
            company: d.input?.company,
            jobTitle: d.input?.jobTitle,
          },
          existing: d.existing ? transformContact(d.existing) : undefined,
        })),
        errors: (result.errors || []).map((e: any) => ({
          input: {
            fullName: e.input?.fullName || '',
            phone: e.input?.phone || '',
            email: e.input?.email,
            company: e.input?.company,
            jobTitle: e.input?.jobTitle,
          },
          message: e.message || 'Validation failed',
          validationErrors: e.errors,
        })),
      };
    }

    // Handle error responses
    await handleResponse<never>(response);
    throw new Error('Unexpected error');
  },
};

export default contactService;
