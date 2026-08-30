import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { User } from "./types";
import {
  verifyUserPassword,
  signupUser,
  getStoredUser,
  storeUser,
  clearStoredUser,
} from "./db";

type AuthState = {
  user: User | null;
  loading: boolean;
  loginEmail: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => void;
  setUser: (u: User) => void;
};

const AuthContext = createContext<AuthState>({} as AuthState);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = getStoredUser();
    if (stored) setUser(stored);
    setLoading(false);
  }, []);

  const loginEmail = useCallback(async (email: string, password: string) => {
    const u = await verifyUserPassword(email, password);
    storeUser(u);
    setUser(u);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const u = await signupUser(name, email, password);
    storeUser(u);
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    clearStoredUser();
    setUser(null);
  }, []);

  const refreshUser = useCallback(() => {
    const stored = getStoredUser();
    if (stored) setUser(stored);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, loginEmail, register, logout, refreshUser, setUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}
