import axios from 'axios';

// Base URL resolution: prefer VITE_API_URL, fallback to VITE_API_BASE_URL or default local URL
const baseURL =
  (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_API_URL || import.meta.env?.VITE_API_BASE_URL)) ||
  'http://localhost:5000/api';

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request Interceptor: Attach Bearer JWT
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: 401 handling and normalized error formatting
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Do not auto-redirect if already on login page
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        window.location.href = '/login?expired=1';
      }
    }

    // Normalized error structure: { success: false, message, field?, status? }
    const formattedError = {
      success: false,
      status: error.response?.status || 500,
      message:
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'An unexpected network error occurred.',
      field: error.response?.data?.field,
      data: error.response?.data,
    };

    return Promise.reject(formattedError);
  }
);

export default api;
