import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000,
  withCredentials: true, // Send and receive HTTP-only cookies (jobtrack_token)
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request helper: attach bearer token header (dual support with cookie)
export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

// Response interceptor for consistent error extraction
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const responseData = error.response?.data;
    const customError = {
      message:
        responseData?.message ||
        responseData?.error?.message ||
        error.message ||
        'An unexpected server error occurred',
      errors: responseData?.errors || [],
      status: error.response?.status || 500,
      data: responseData,
    };
    return Promise.reject(customError);
  }
);

export default api;
