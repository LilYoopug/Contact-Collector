
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
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  joinedAt: Date;
  totalContacts?: number;
  password?: string;
  avatarUrl?: string;
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
