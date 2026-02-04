"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

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
      const res = await fetch("/api/auth/me");
      const data = await res.json();
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
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code, name }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || "登录失败");
    }

    const data = await res.json();
    setUser(data.user);
  };

  const register = async (email: string, code: string, password: string, name: string) => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code, password, name }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || "注册失败");
    }

    const data = await res.json();
    setUser(data.user);
  };

  const loginWithPassword = async (email: string, password: string) => {
    const res = await fetch("/api/auth/login-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || "登录失败");
    }

    const data = await res.json();
    setUser(data.user);
  };

  const resetPassword = async (email: string, code: string, newPassword: string) => {
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code, newPassword }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || "重置密码失败");
    }
  };

  const updateProfile = async (updates: { name?: string; avatar?: string }) => {
    const res = await fetch("/api/auth/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });

    if (!res.ok) {
      throw new Error("Failed to update profile");
    }

    const data = await res.json();
    setUser(data.user);
  };

  const logout = async () => {
    // Implement logout API if needed (clear cookie)
    // For now just clear state, but ideally call an API route to clear cookie
    await fetch("/api/auth/logout", { method: "POST" }); // We'll create this route
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, loginWithPassword, resetPassword, updateProfile, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
