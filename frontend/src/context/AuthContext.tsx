import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, ApiError } from '../api/client';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isRole: (...roles: string[]) => boolean;
  hasPermission: (module: string, action?: 'create' | 'read' | 'update' | 'delete' | 'approve') => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('groupon_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('groupon_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadUser() {
      if (token) {
        try {
          const res = await api.getMe();
          setUser(res.user);
          localStorage.setItem('groupon_user', JSON.stringify(res.user));
        } catch (err) {
          console.error("Auth check failed:", err);
          logout();
        }
      }
      setIsLoading(false);
    }
    loadUser();
  }, [token]);

  const login = async (email: string, password: string) => {
    const res = await api.login({ email, password });
    localStorage.setItem('groupon_token', res.access_token);
    localStorage.setItem('groupon_user', JSON.stringify(res.user));
    setToken(res.access_token);
    setUser(res.user);
  };

  const logout = () => {
    localStorage.removeItem('groupon_token');
    localStorage.removeItem('groupon_user');
    setToken(null);
    setUser(null);
  };

  const isRole = (...roles: string[]): boolean => {
    if (!user) return false;
    if (user.role === 'Super Admin') return true;
    return roles.includes(user.role);
  };

  const hasPermission = (module: string, action: 'create' | 'read' | 'update' | 'delete' | 'approve' = 'read'): boolean => {
    if (!user) return false;
    if (user.role === 'Super Admin') return true;
    if (!user.permissions) return false;

    const perm = user.permissions.find((p) => p.module === module);
    if (!perm) return false;

    const key = `can_${action}` as keyof typeof perm;
    return Boolean(perm[key]);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        logout,
        isRole,
        hasPermission,
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
