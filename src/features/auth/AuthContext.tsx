"use client";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  authApi,
  type UserProfile,
  type LoginPayload,
  type UpdateProfilePayload,
} from "@/services/auth-api";
import { useQueryClient } from "@tanstack/react-query";
import { fitSsoApi } from "@/services/fit-sso-api";

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<UserProfile>;
  logout: () => Promise<string | undefined>;
  logoutAll: () => Promise<void>;
  changePassword: (current: string, next: string) => Promise<void>;
  updateProfile: (payload: UpdateProfilePayload) => Promise<UserProfile>;
  refresh: () => Promise<UserProfile | null>;
  acceptSession: () => Promise<UserProfile | null>;
  clearLocalSession: () => void;
  hasPermission: (permission: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const removeLegacyTokens = () => {
    if (typeof window === "undefined") return;
    for (const name of ["accessToken", "refreshToken", "token", "auth_token"]) {
      try {
        localStorage.removeItem(name);
        sessionStorage.removeItem(name);
      } catch {
        /* Browser storage may be disabled. */
      }
    }
  };
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const fetchCurrentUser = async () => {
    try {
      const profile = await authApi.getMe();
      setUser(profile);
      return profile;
    } catch {
      setUser(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    removeLegacyTokens();
    void fetchCurrentUser();
  }, []);
  useEffect(() => {
    const expired = () => {
      setUser(null);
      setIsLoading(false);
      queryClient.clear();
      removeLegacyTokens();
    };
    window.addEventListener("lab-session-expired", expired);
    return () => window.removeEventListener("lab-session-expired", expired);
  }, [queryClient]);
  const login = async (payload: LoginPayload) => {
    setIsLoading(true);
    try {
      removeLegacyTokens();
      await authApi.login(payload);
      queryClient.clear();
      const profile = await fetchCurrentUser();
      if (!profile) throw new Error("Không thể tải thông tin người dùng");
      return profile;
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };
  const logout = async () => {
    setIsLoading(true);
    try {
      let redirectTo: string | undefined;
      if (user?.usesSso) redirectTo = (await fitSsoApi.logout()).redirectTo;
      else await authApi.logout();
      setUser(null);
      queryClient.clear();
      removeLegacyTokens();
      return redirectTo;
    } finally {
      setIsLoading(false);
    }
  };
  const logoutAll = async () => {
    await authApi.logoutAll();
    setUser(null);
    queryClient.clear();
    removeLegacyTokens();
  };
  const changePassword = async (current: string, next: string) => {
    await authApi.changePassword(current, next);
    setUser((value) =>
      value ? { ...value, mustChangePassword: false } : value,
    );
  };
  const updateProfile = async (payload: UpdateProfilePayload) => {
    const profile = await authApi.updateMe(payload);
    setUser(profile);
    return profile;
  };
  const refresh = async () => {
    await authApi.refresh();
    return fetchCurrentUser();
  };
  const acceptSession = async () => {
    removeLegacyTokens();
    queryClient.clear();
    return fetchCurrentUser();
  };
  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      logout,
      logoutAll,
      changePassword,
      updateProfile,
      refresh,
      acceptSession,
      clearLocalSession: () => {
        setUser(null);
        queryClient.clear();
        removeLegacyTokens();
      },
      hasPermission: (permission) =>
        !!user &&
        (user.roles.includes("ADMIN") || user.permissions.includes(permission)),
      hasAnyRole: (roles) =>
        !!user && roles.some((role) => user.roles.includes(role)),
    }),
    [user, isLoading],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
