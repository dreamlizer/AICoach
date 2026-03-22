"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";

type User = {
  id: number;
  email: string;
  name?: string;
  avatar?: string;
} | null;

type AuthContextType = {
  user: User;
  loading: boolean;
  login: (email: string, code: string, name?: string) => Promise<void>;
  register: (email: string, code: string, password: string, name: string) => Promise<void>;
  loginWithPassword: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string, code: string, newPassword: string) => Promise<void>;
  updateProfile: (updates: { name?: string; avatar?: string }) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  loginWithPassword: async () => {},
  resetPassword: async () => {},
  updateProfile: async () => {},
  logout: async () => {},
  checkAuth: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    try {
      const data: any = await apiClient.auth.me();
      setUser(data.user);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (email: string, code: string, name?: string) => {
    try {
      const data: any = await apiClient.auth.login(email, code, name);
      setUser(data.user);
    } catch (error: any) {
      throw new Error(error.message || "登录失败");
    }
  };

  const register = async (email: string, code: string, password: string, name: string) => {
    try {
      const data: any = await apiClient.auth.register(email, code, password, name);
      setUser(data.user);
    } catch (error: any) {
      throw new Error(error.message || "注册失败");
    }
  };

  const loginWithPassword = async (email: string, password: string) => {
    try {
      const data: any = await apiClient.auth.loginWithPassword(email, password);
      setUser(data.user);
    } catch (error: any) {
      throw new Error(error.message || "登录失败");
    }
  };

  const resetPassword = async (email: string, code: string, newPassword: string) => {
    try {
      await apiClient.auth.resetPassword(email, code, newPassword);
    } catch (error: any) {
      throw new Error(error.message || "重置密码失败");
    }
  };

  const updateProfile = async (updates: { name?: string; avatar?: string }) => {
    try {
      const data: any = await apiClient.auth.updateProfile(updates);
      setUser(data.user);
    } catch (error: any) {
      throw new Error("Failed to update profile");
    }
  };

  const logout = async () => {
    await apiClient.auth.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, loginWithPassword, resetPassword, updateProfile, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
