import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi, UserProfile, LoginPayload } from '../../services/auth-api';
import { apiClient } from '../../services/api-client';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (current: string, newPass: string) => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCurrentUser = async () => {
    try {
      const profile = await authApi.getMe();
      setUser(profile);
    } catch (error) {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const login = async (payload: LoginPayload) => {
    setIsLoading(true);
    try {
      const data = await authApi.login(payload);
      apiClient.defaults.headers.common['Authorization'] = 'Bearer ' + data.accessToken;
      await fetchCurrentUser();
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authApi.logout();
    } catch (error) {
      // Ignore errors on logout
    } finally {
      setUser(null);
      delete apiClient.defaults.headers.common['Authorization'];
      setIsLoading(false);
    }
  };

  const changePassword = async (current: string, newPass: string) => {
    await authApi.changePassword(current, newPass);
    if (user) {
      setUser({ ...user, mustChangePassword: false });
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    if (user.roles.includes('ADMIN')) return true;
    return user.permissions.includes(permission);
  };

  const hasAnyRole = (roles: string[]): boolean => {
    if (!user) return false;
    return roles.some(role => user.roles.includes(role));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        changePassword,
        hasPermission,
        hasAnyRole
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
