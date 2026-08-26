import React, { createContext, useContext, useState, useEffect } from 'react';
import { FinOpsAPI } from '../services/api';
import type { IMerchant } from '../types';

interface AuthContextType {
  merchant: IMerchant | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  demoLogin: () => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [merchant, setMerchant] = useState<IMerchant | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('finops_auth_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchProfile = async () => {
    try {
      if (token) {
        const res = await FinOpsAPI.getMe();
        const m = res.merchant || res.data?.merchant || res.data;
        if (res.success && m) {
          setMerchant(m);
        } else {
          setMerchant(null);
          setToken(null);
          localStorage.removeItem('finops_auth_token');
        }
      }
    } catch {
      setMerchant(null);
      setToken(null);
      localStorage.removeItem('finops_auth_token');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [token]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await FinOpsAPI.login(email, password);
      const authToken = res.token || res.data?.token;
      const authMerchant = res.merchant || res.data?.merchant || res.data;

      if (res.success && authToken) {
        localStorage.setItem('finops_auth_token', authToken);
        setToken(authToken);
        setMerchant(authMerchant || { name: 'NovaKart', email, currency: 'INR', _id: 'm1', createdAt: new Date().toISOString() });
      } else {
        throw new Error(res.message || 'Login failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const demoLogin = async () => {
    return login('merchant@novakart.demo', 'Demo@12345');
  };

  const logout = () => {
    localStorage.removeItem('finops_auth_token');
    setToken(null);
    setMerchant(null);
  };

  return (
    <AuthContext.Provider
      value={{
        merchant,
        token,
        isAuthenticated: !!token && !!merchant,
        isLoading,
        login,
        demoLogin,
        logout,
        refreshProfile: fetchProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
