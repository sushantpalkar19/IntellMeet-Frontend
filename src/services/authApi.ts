import axios from 'axios';
import { resolveApiBaseUrl } from './apiBase';

const API_URL = resolveApiBaseUrl(import.meta.env.VITE_API_URL);

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
  createdAt: string;
  updatedAt?: string;
  mustChangePassword?: boolean;
}

export interface AuthResponse {
  message: string;
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse extends AuthResponse {
  message: 'Login successful';
}

export interface RegisterResponse extends AuthResponse {
  message: 'User registered successfully';
}

export interface RefreshTokenResponse {
  accessToken: string;
}

export interface ProfileResponse {
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

// NOTE: Token Storage Security Considerations
// 
// Current Implementation: localStorage
// - Tokens are stored in localStorage (accessToken, refreshToken, user)
// - This is the approach used because the backend returns tokens in JSON response
// - The backend does NOT currently support httpOnly cookie-based token storage
//
// Security Trade-offs:
// - localStorage is vulnerable to XSS attacks
// - If malicious JavaScript runs on the page, it can access tokens
// - However, this is the standard approach for SPAs without httpOnly cookie support
//
// Recommended Improvements (for future):
// 1. Implement httpOnly cookie-based refresh tokens on backend
// 2. Use short-lived access tokens (15 min) with secure cookie refresh
// 3. Add CSRF protection if using cookies
// 4. Consider implementing PKCE for additional security
//
// Current Mitigations:
// - Access tokens expire in 15 minutes
// - Refresh tokens expire in 7 days
// - Automatic token refresh on 401 errors
// - Tokens are cleared on logout
// - HTTPS should be used in production

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Export api instance for reuse
export default api;

// Add authorization header to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token refresh on 401 errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post<RefreshTokenResponse>(
            `${API_URL}/v1/auth/refresh`,
            { refreshToken }
          );

          const { accessToken } = response.data;
          localStorage.setItem('accessToken', accessToken);

          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, clear tokens and redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/v1/auth/login', credentials);
    return response.data;
  },

  register: async (credentials: RegisterCredentials): Promise<RegisterResponse> => {
    const response = await api.post<RegisterResponse>('/v1/auth/register', credentials);
    return response.data;
  },

  refreshToken: async (refreshToken: string): Promise<RefreshTokenResponse> => {
    const response = await axios.post<RefreshTokenResponse>(
      `${API_URL}/v1/auth/refresh`,
      { refreshToken }
    );
    return response.data;
  },

  getProfile: async (): Promise<ProfileResponse> => {
    const response = await api.get<ProfileResponse>('/v1/auth/profile');
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  },
};
