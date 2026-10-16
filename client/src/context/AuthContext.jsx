import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { loginApi, registerApi, logoutApi, getMeApi } from '../api/auth.api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  /**
   * Restore existing session on initial application mount using GET /api/auth/me
   * Relies on the backend's HTTP-only cookie
   */
  const checkSession = useCallback(async () => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const response = await getMeApi();
      if (response?.data?.user) {
        setUser(response.data.user);
      } else {
        setUser(null);
      }
    } catch {
      // 401 Unauthorized simply means no active session exists; clear user silently
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  /**
   * Log in with email and password
   */
  const login = async (credentials) => {
    setAuthError(null);
    const response = await loginApi(credentials);
    const authenticatedUser = response?.data?.user;
    if (authenticatedUser) {
      setUser(authenticatedUser);
    }
    return response;
  };

  /**
   * Register a new user with allowed public role (candidate or recruiter)
   * Optionally auto-logs the user in
   */
  const register = async (userData, autoLogin = true) => {
    setAuthError(null);
    const response = await registerApi(userData);
    if (autoLogin && userData.email && userData.password) {
      const loginResponse = await loginApi({
        email: userData.email,
        password: userData.password,
      });
      setUser(loginResponse?.data?.user || response?.data?.user);
      return loginResponse;
    }
    return response;
  };

  /**
   * Terminate active session and clear cookie
   */
  const logout = async () => {
    try {
      await logoutApi();
    } catch (err) {
      console.warn('Logout API error:', err);
    } finally {
      setUser(null);
    }
  };

  /**
   * Refresh current user profile details
   */
  const refreshUser = async () => {
    try {
      const response = await getMeApi();
      if (response?.data?.user) {
        setUser(response.data.user);
      }
    } catch (err) {
      console.warn('Failed to refresh user profile:', err);
    }
  };

  const value = {
    user,
    isAuthenticated: Boolean(user),
    isLoading,
    authError,
    setAuthError,
    role: user?.role || null,
    isCandidate: user?.role === 'candidate',
    isRecruiter: user?.role === 'recruiter',
    isAdmin: user?.role === 'admin',
    login,
    register,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
