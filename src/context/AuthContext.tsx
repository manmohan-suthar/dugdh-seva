import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';
import { Dairy } from '../types';

interface AuthContextType {
  user: Dairy | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (phone: string, password: string) => Promise<any>;
  register: (data: any) => Promise<any>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Dairy | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchProfile = async (authToken: string) => {
    try {
      const response = await api.get('/auth/me');
      setUser(response.data);
      setToken(authToken);
    } catch (error) {
      console.error('Failed to load user profile on init:', error);
      // Clean up invalid credentials
      localStorage.removeItem('dairy_token');
      localStorage.removeItem('dairy_info');
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const storedToken = localStorage.getItem('dairy_token');
    const storedUser = localStorage.getItem('dairy_info');

    if (storedToken) {
      if (storedUser) {
        setUser(JSON.parse(storedUser));
        setToken(storedToken);
        setLoading(false);
        // Refresh silently in background to keep data fresh
        api.get('/auth/me')
          .then(res => {
            setUser(res.data);
            localStorage.setItem('dairy_info', JSON.stringify(res.data));
          })
          .catch(() => {});
      } else {
        fetchProfile(storedToken);
      }
    } else {
      setLoading(false);
    }

    // Unauthorized handler from API interceptor
    const handleUnauthorized = () => {
      setUser(null);
      setToken(null);
    };

    window.addEventListener('auth-unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth-unauthorized', handleUnauthorized);
    };
  }, []);

  const login = async (phone: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { phone, password });
      const { token: receivedToken, dairy } = response.data;
      
      localStorage.setItem('dairy_token', receivedToken);
      localStorage.setItem('dairy_info', JSON.stringify(dairy));
      
      setToken(receivedToken);
      setUser(dairy);
      return { success: true };
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Login fail, please check details.';
      return { success: false, error: errorMsg };
    }
  };

  const register = async (signUpData: any) => {
    try {
      const response = await api.post('/auth/register', signUpData);
      const { token: receivedToken, dairy } = response.data;
      
      localStorage.setItem('dairy_token', receivedToken);
      localStorage.setItem('dairy_info', JSON.stringify(dairy));
      
      setToken(receivedToken);
      setUser(dairy);
      return { success: true };
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Registration failed.';
      return { success: false, error: errorMsg };
    }
  };

  const logout = () => {
    localStorage.removeItem('dairy_token');
    localStorage.removeItem('dairy_info');
    setUser(null);
    setToken(null);
  };

  const refreshUser = async () => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data);
      localStorage.setItem('dairy_info', JSON.stringify(res.data));
    } catch (err) {
      console.error('Error refreshing dairy profile:', err);
    }
  };

  const isAuthenticated = !!token;

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
};
