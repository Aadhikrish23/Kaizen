import axios from 'axios';

export const apiClient = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
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
        await axios.post('http://localhost:5000/api/v1/auth/refresh', {}, { withCredentials: true });
        return apiClient(originalRequest);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }
    // You can handle global toast notifications here if desired
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error.response?.data?.error || error);
  }
);
