export const API_BASE = '/api';

export interface ApiResponse<T = any> {
  success?: boolean;
  error?: string;
  data?: T;
  [key: string]: any;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers, credentials: 'include' });
  
  // Handle 401 Unauthorized globally if needed (e.g. redirect to login)
  // if (response.status === 401) { ... }

  const contentType = response.headers.get("content-type") || "";
  const rawText = await response.text();
  let data: any = {};
  if (rawText) {
    if (contentType.includes("application/json")) {
      data = JSON.parse(rawText);
    } else {
      try {
        data = JSON.parse(rawText);
      } catch {
        data = { error: rawText.slice(0, 180) };
      }
    }
  }

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  return data;
}

export const apiClient = {
  auth: {
    sendCode: (email: string, type: string) => 
      request('/auth/send-code', {
        method: 'POST',
        body: JSON.stringify({ email, type }),
      }),
      
    login: (email: string, code: string, name?: string) => 
      request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, code, name }),
      }),
      
    loginWithPassword: (email: string, password: string) => 
      request('/auth/login-password', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
      
    register: (email: string, code: string, password: string, name: string) => 
      request('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, code, password, name }),
      }),
      
    resetPassword: (email: string, code: string, newPassword: string) => 
      request('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email, code, newPassword }),
      }),
      
    updateProfile: (updates: { name?: string; avatar?: string }) => 
      request('/auth/update', {
        method: 'POST',
        body: JSON.stringify(updates),
      }),
      
    logout: () => request('/auth/logout', { method: 'POST' }),
    
    me: () => request('/auth/me'),
  },

  conversations: {
    merge: (conversationId: string) => 
      request('/conversations/merge', {
        method: 'POST',
        body: JSON.stringify({ conversationId }),
      }),
      
    create: (conversationId: string, title: string, toolId?: string) => 
      request('/conversation', {
        method: 'POST',
        body: JSON.stringify({ conversationId, title, toolId }),
      }),
  },

  history: {
    list: () => request<any[]>('/history'),
    get: (id: string) => request<any[]>(`/history/${id}`),
    delete: (id: string) => request(`/history/${id}`, { method: 'DELETE' }),
    resolve: (code: string) => request<{ id: string; shortCode?: string | null }>(`/history/resolve?c=${encodeURIComponent(code)}`),
  },
};
