import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "./supabase";
import type { User } from "./types";

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

async function fetchProfile(uid: string): Promise<User | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, email, picture, vehicle")
    .eq("id", uid)
    .maybeSingle();
  if (error || !data) return null;
  return {
    user_id: data.id,
    name: data.name,
    email: data.email ?? "",
    picture: data.picture,
    vehicle: data.vehicle,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const bootstrap = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session?.user) {
      const u = sessionData.session.user;
      const profile = await fetchProfile(u.id);
      if (profile) {
        setUser(profile);
      } else {
        setUser({
          user_id: u.id,
          name: u.user_metadata?.name ?? u.email ?? "",
          email: u.email ?? "",
          picture: u.user_metadata?.picture ?? null,
          vehicle: null,
        });
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    bootstrap();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        if (session?.user) {
          const profile = await fetchProfile(session.user.id);
          if (profile) setUser(profile);
          else
            setUser({
              user_id: session.user.id,
              name: session.user.user_metadata?.name ?? session.user.email ?? "",
              email: session.user.email ?? "",
              picture: session.user.user_metadata?.picture ?? null,
              vehicle: null,
            });
        } else {
          setUser(null);
        }
      })();
    });
    return () => sub.subscription.unsubscribe();
  }, [bootstrap]);

  const loginEmail = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) throw new Error(error.message);
    if (data.user) {
      const profile = await fetchProfile(data.user.id);
      if (profile) setUser(profile);
      else
        setUser({
          user_id: data.user.id,
          name,
          email,
          picture: null,
          vehicle: null,
        });
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session?.user) {
      const profile = await fetchProfile(sessionData.session.user.id);
      if (profile) setUser(profile);
    }
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
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
