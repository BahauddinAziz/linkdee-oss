import React, { createContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

export const AuthContext = createContext(null);

/** Decode a JWT payload without verifying signature (for client-side use only) */
const decodeJwt = (token) => {
  try {
    const base64Payload = token.split('.')[1];
    const decoded = JSON.parse(atob(base64Payload.replace(/-/g, '+').replace(/_/g, '/')));
    return decoded;
  } catch {
    return null;
  }
};

/** Check if a JWT is expired */
const isTokenExpired = (token) => {
  const payload = decodeJwt(token);
  if (!payload || !payload.exp) return true;
  return Date.now() / 1000 > payload.exp;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  /** Restore session from localStorage on mount */
  useEffect(() => {
    const token = api.getToken();
    if (token && !isTokenExpired(token)) {
      const payload = decodeJwt(token);
      if (payload) {
        setUser({
          id: payload.sub || payload.id,
          email: payload.email,
          name: payload.name,
        });
      }
    } else if (token) {
      // Token exists but is expired — clear it
      api.clearTokens();
    }
    setIsLoading(false);
  }, []);

  /** Listen for global auth-expired events from the API client */
  useEffect(() => {
    const handleAuthExpired = () => {
      setUser(null);
      api.clearTokens();
    };
    window.addEventListener('lr:auth-expired', handleAuthExpired);
    return () => window.removeEventListener('lr:auth-expired', handleAuthExpired);
  }, []);

  /** Login with email and password */
  const login = useCallback(async (email, password) => {
    const data = await api.post('/api/v1/auth/login', { email, password });
    const { accessToken, refreshToken, user: userData } = data;

    api.setToken(accessToken);
    if (refreshToken) localStorage.setItem('lr_refresh_token', refreshToken);

    const payload = decodeJwt(accessToken);
    setUser(userData || {
      id: payload?.sub || payload?.id,
      email: payload?.email || email,
      name: payload?.name,
    });

    return data;
  }, []);

  /** Signup with email and password */
  const signup = useCallback(async (email, password) => {
    const data = await api.post('/api/v1/auth/signup', { email, password });
    const { accessToken, refreshToken, user: userData } = data;

    api.setToken(accessToken);
    if (refreshToken) localStorage.setItem('lr_refresh_token', refreshToken);

    const payload = decodeJwt(accessToken);
    setUser(userData || {
      id: payload?.sub || payload?.id,
      email: payload?.email || email,
      name: payload?.name,
    });

    return data;
  }, []);

  /** Logout */
  const logout = useCallback(async () => {
    try {
      await api.post('/api/v1/auth/logout', {});
    } catch {
      // Even if the request fails, clear local state
    } finally {
      api.clearTokens();
      setUser(null);
    }
  }, []);

  const value = {
    user,
    isLoading,
    login,
    signup,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
