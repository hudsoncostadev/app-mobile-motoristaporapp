import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, saveToken, clearToken, loadToken } from "@/src/api/client";

export type User = {
  user_id: string;
  name: string;
  email: string;
  picture?: string | null;
  vehicle?: string | null;
};

type AuthState = {
  user: User | null;
  loading: boolean;
  loginEmail: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: (u: User) => void;
};

const AuthContext = createContext<AuthState>({} as AuthState);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const bootstrap = useCallback(async () => {
    try {
      const token = await loadToken();
      if (token) {
        const res = await api<{ user: User }>("/auth/me");
        setUser(res.user);
      }
    } catch (e) {
      await clearToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const loginEmail = useCallback(async (email: string, password: string) => {
    const res = await api<{ session_token: string; user: User }>("/auth/login", {
      method: "POST",
      body: { email, password },
      auth: false,
    });
    await saveToken(res.session_token);
    setUser(res.user);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const res = await api<{ session_token: string; user: User }>("/auth/register", {
      method: "POST",
      body: { name, email, password },
      auth: false,
    });
    await saveToken(res.session_token);
    setUser(res.user);
  }, []);

  const refreshUser = useCallback(async () => {
    const res = await api<{ user: User }>("/auth/me");
    setUser(res.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api("/auth/logout", { method: "POST" });
    } catch {}
    await clearToken();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, loginEmail, register, logout, refreshUser, setUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}
