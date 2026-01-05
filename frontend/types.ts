
export enum ConsentStatus {
  OptIn = 'opt_in',
  OptOut = 'opt_out',
  Unknown = 'unknown',
}

export enum Source {
  OcrList = 'ocr_list',
  Form = 'form',
  Import = 'import',
  Manual = 'manual',
}

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  // Optional fields for admin views
  totalContacts?: number;
  isActive?: boolean;
}

// For creating new users (admin)
export interface CreateUserData {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  phone?: string;
}

// For updating users (admin)
export interface UpdateUserData {
  name?: string;
  email?: string;
  password?: string;
  role?: UserRole;
  phone?: string;
  isActive?: boolean;
}

// Admin dashboard statistics
export interface DashboardStats {
  totalUsers: number;
  activeUsersThisMonth: number;
  totalContacts: number;
  contactsThisWeek: number;
}

export interface Contact {
  id: string;
  fullName: string;
  phone: string; // E.164 format
  email: string;
  company: string;
  jobTitle: string;
  source: Source;
  consent: ConsentStatus;
  createdAt: Date;
}

export interface OcrResultRow {
  fullName: string;
  phone: string;
  email: string;
  company: string;
}
