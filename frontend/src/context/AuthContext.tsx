import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { api, saveToken, clearToken, loadToken } from "@/src/api/client";

WebBrowser.maybeCompleteAuthSession();

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
  loginGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: (u: User) => void;
};

const AuthContext = createContext<AuthState>({} as AuthState);
export const useAuth = () => useContext(AuthContext);

const processedSessions = new Set<string>();

function extractSessionId(url: string | null): string | null {
  if (!url) return null;
  const m = url.match(/[?#&]session_id=([^&#]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const exchangeSession = useCallback(async (sessionId: string) => {
    if (!sessionId || processedSessions.has(sessionId)) return;
    processedSessions.add(sessionId);
    const res = await api<{ session_token: string; user: User }>("/auth/session", {
      method: "POST",
      body: { session_id: sessionId },
      auth: false,
    });
    await saveToken(res.session_token);
    setUser(res.user);
  }, []);

  const bootstrap = useCallback(async () => {
    try {
      // Web: process session_id from URL first
      if (Platform.OS === "web") {
        const url = typeof window !== "undefined" ? window.location.href : null;
        const sid = extractSessionId(url);
        if (sid) {
          await exchangeSession(sid);
          if (typeof window !== "undefined") {
            const clean = window.location.origin + window.location.pathname;
            window.history.replaceState(window.history.state, "", clean);
          }
          setLoading(false);
          return;
        }
      } else {
        const initial = await Linking.getInitialURL();
        const sid = extractSessionId(initial);
        if (sid) {
          await exchangeSession(sid);
          setLoading(false);
          return;
        }
      }

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
  }, [exchangeSession]);

  useEffect(() => {
    bootstrap();
    const sub = Linking.addEventListener("url", ({ url }) => {
      const sid = extractSessionId(url);
      if (sid) exchangeSession(sid).catch(() => {});
    });
    return () => sub.remove();
  }, [bootstrap, exchangeSession]);

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

  const loginGoogle = useCallback(async () => {
    const redirectUrl =
      Platform.OS === "web"
        ? window.location.origin + "/"
        : Linking.createURL("");
    const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;

    if (Platform.OS === "web") {
      window.location.href = authUrl;
      return;
    }

    let captured: string | null = null;
    const sub = Linking.addEventListener("url", ({ url }) => {
      if (!captured) captured = url;
    });
    try {
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
      let url: string | null = null;
      if (result.type === "success" && (result as any).url) {
        url = (result as any).url;
      }
      if (!url) url = captured;
      if (!url) url = await Linking.getInitialURL();
      const sid = extractSessionId(url);
      if (sid) await exchangeSession(sid);
    } finally {
      sub.remove();
    }
  }, [exchangeSession]);

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
      value={{ user, loading, loginEmail, register, loginGoogle, logout, refreshUser, setUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}
