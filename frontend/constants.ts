// This file is kept for backwards compatibility but mock data has been removed.
// All data now comes from the API.

// API Configuration
// @ts-ignore - Vite provides import.meta.env at runtime
export const API_BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:8000/api';

// Public contact submission endpoint (for webforms)
export const PUBLIC_CONTACTS_ENDPOINT = `${API_BASE_URL}/public/contacts`;

// Helper to get display URL (shows production URL in prod, localhost in dev)
// @ts-ignore
export const getPublicEndpointDisplay = () => {
  // @ts-ignore
  const baseUrl = import.meta.env?.VITE_API_URL;
  if (baseUrl) {
    return `${baseUrl}/public/contacts`;
  }
  return 'http://localhost:8000/api/public/contacts';
};
