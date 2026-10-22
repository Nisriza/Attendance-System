import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types/index.ts';
import { api, getStoredToken } from '../services/api.ts';

interface LoginPayload {
  role?: 'lecturer' | 'student';
  fullname?: string;
  name?: string;
  username?: string;
  password?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (payload: LoginPayload | string, password?: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUserInState: (updated: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const res = await api.getCurrentUser();
      setUser(res.user);
    } catch (err) {
      console.warn('Session expired or invalid token:', err);
      api.logout();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (payload: LoginPayload | string, passwordArg?: string): Promise<User> => {
    setLoading(true);
    try {
      const res = await api.login(payload, passwordArg);
      setUser(res.user);
      return res.user;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
  };

  const updateUserInState = (updated: User) => {
    setUser(updated);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        refreshUser,
        updateUserInState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
