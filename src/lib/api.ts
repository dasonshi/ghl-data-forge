const API_BASE = import.meta.env.VITE_API_BASE || 'https://importer.api.savvysales.ai';

/**
 * Global fetch wrapper that ensures all API calls include credentials
 * and use the correct API hostname.
 */
export const apiClient = {
  async fetch(url: string, options: RequestInit = {}) {
    const fullUrl = url.startsWith('/') ? `${API_BASE}${url}` : url;
    return fetch(fullUrl, {
      credentials: 'include',
      ...options,
    });
  },

  async get(endpoint: string, options: RequestInit = {}) {
    return this.fetch(endpoint, { ...options, method: 'GET' });
  },

  async post(endpoint: string, data?: any, options: RequestInit = {}) {
    const isFormData = data instanceof FormData;
    return this.fetch(endpoint, {
      method: 'POST',
      ...(!isFormData && { headers: { 'Content-Type': 'application/json' } }),
      ...options,
      body: isFormData ? data : (data ? JSON.stringify(data) : undefined),
    });
  },

  async put(endpoint: string, data?: any, options: RequestInit = {}) {
    const isFormData = data instanceof FormData;
    return this.fetch(endpoint, {
      method: 'PUT',
      ...(!isFormData && { headers: { 'Content-Type': 'application/json' } }),
      ...options,
      body: isFormData ? data : (data ? JSON.stringify(data) : undefined),
    });
  },

  async delete(endpoint: string, options: RequestInit = {}) {
    return this.fetch(endpoint, { ...options, method: 'DELETE' });
  }
};

// Legacy support - replace direct fetch calls with this
export const clientFetch = (url: string, opts: RequestInit = {}) => 
  fetch(url, { credentials: 'include', ...opts });