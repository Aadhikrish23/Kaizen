import axios, { AxiosRequestConfig } from 'axios';
import { clearApiCache } from '../offline/apiCache';

// Kept here (not imported from offline/online.ts) so the API client has no dependency on React hooks
export const NEEDS_CONNECTION_MESSAGE = 'You are offline. This action needs a connection; please try again when you are back online.';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

export const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach Bearer token
apiClient.interceptors.request.use((config) => {
  // Only the simple add-only logs (meals, water, weight, sleep) can be queued offline (via submitOrQueue, which never
  // reaches here while offline). Every other write needs a connection: fail fast with a clear message.
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    const method = (config.method || 'get').toLowerCase();
    if (method !== 'get' && !(config.url || '').startsWith('/auth/')) {
      return Promise.reject(new Error(NEEDS_CONNECTION_MESSAGE));
    }
  }
  const token = localStorage.getItem('kaizen_access_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor for handling global errors seamlessly
apiClient.interceptors.response.use(
  (response) => {
    // We expect { success: true, data: T } 
    return response.data.data; // strip the envelope for easier consumption
  },
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshRes = await axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true });
        const newToken = refreshRes.data?.data?.accessToken;
        if (newToken) {
          localStorage.setItem('kaizen_access_token', newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Forced logout: the session is gone, so are the cached responses that belonged to it
        localStorage.removeItem('kaizen_access_token');
        void clearApiCache();
        return Promise.reject(refreshError);
      }
    }
    console.error('API Error:', error.response?.data || error.message);
    // Server errors are rejected as their {code, message, details} object plus the HTTP status (so callers can tell a
    // rejected request from a transient failure); anything without a response (offline, DNS, timeout) is the raw axios error.
    const serverError = error.response?.data?.error;
    return Promise.reject(serverError && typeof serverError === 'object' ? { ...serverError, status: error.response.status } : error);
  }
);

/**
 * Typed API helpers. The response interceptor above unwraps `{ success, data }` and returns `data`, so a call resolves
 * to the payload `T`, not an AxiosResponse. `apiClient.get<T>()` still claims AxiosResponse<T>, which is why call
 * sites used to cast; use these instead (the single cast lives here).
 */
const unwrap = <T>(p: Promise<unknown>): Promise<T> => p as Promise<T>;

export const api = {
  get: <T>(url: string, config?: AxiosRequestConfig) => unwrap<T>(apiClient.get(url, config)),
  post: <T, B = unknown>(url: string, body?: B, config?: AxiosRequestConfig) => unwrap<T>(apiClient.post(url, body, config)),
  put: <T, B = unknown>(url: string, body?: B, config?: AxiosRequestConfig) => unwrap<T>(apiClient.put(url, body, config)),
  patch: <T, B = unknown>(url: string, body?: B, config?: AxiosRequestConfig) => unwrap<T>(apiClient.patch(url, body, config)),
  delete: <T = null>(url: string, config?: AxiosRequestConfig) => unwrap<T>(apiClient.delete(url, config)),
};
