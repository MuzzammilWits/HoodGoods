// src/utils/api.ts
import axios, { AxiosInstance } from 'axios';

const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
});

// Add request interceptor to inject token
api.interceptors.request.use(async (config) => {
  // Get token from localStorage (set by Auth0)
  const token = localStorage.getItem('access_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403) {
      console.error('Forbidden - Check user permissions');
    }
    return Promise.reject(error);
  }
);

export default api;