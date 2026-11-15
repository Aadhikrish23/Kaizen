import axios, { AxiosRequestConfig } from 'axios';

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
        localStorage.removeItem('kaizen_access_token');
        return Promise.reject(refreshError);
      }
    }
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error.response?.data?.error || error);
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
