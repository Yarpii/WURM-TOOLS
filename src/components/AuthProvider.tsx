"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface User {
  id: number;
  username: string;
  email: string;
  role: "user" | "admin";
}

interface LoginResult {
  success: boolean;
  error?: string;
  user?: User;
  requires2FA?: boolean;
  tempToken?: string;
  expiresIn?: number;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<LoginResult>;
  verify2FA: (tempToken: string, code: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const res = await fetch("/api/auth/session");
      const data = await res.json();

      if (data.authenticated && data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const login = async (username: string, password: string): Promise<LoginResult> => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      // Check if 2FA is required
      if (data.requires2FA) {
        return {
          success: false,
          requires2FA: true,
          tempToken: data.tempToken,
          expiresIn: data.expiresIn,
        };
      }

      if (res.ok && data.user) {
        setUser(data.user);
        return { success: true, user: data.user };
      }

      return { success: false, error: data.error || "Login failed" };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  };

  const verify2FA = async (tempToken: string, code: string): Promise<LoginResult> => {
    try {
      const res = await fetch("/api/auth/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tempToken, code }),
      });

      const data = await res.json();

      if (res.ok && data.user) {
        setUser(data.user);
        return { success: true, user: data.user };
      }

      return { success: false, error: data.error || "Verification failed" };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, verify2FA, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
