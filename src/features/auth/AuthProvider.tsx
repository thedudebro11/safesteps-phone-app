// src/features/auth/AuthProvider.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/src/lib/supabase";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  isInitialLoading: boolean;
  isAuthActionLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isAuthActionLoading, setIsAuthActionLoading] = useState(false);

  // Load initial session + subscribe to changes
  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (!isMounted) return;

      if (error) {
        console.warn("Error loading session", error);
      }

      setSession(data.session ?? null);
      setUser(data.session?.user ?? null);
      setIsInitialLoading(false);
    };

    loadSession();

    const {
      data: authListener,
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signIn: AuthContextValue["signIn"] = async (email, password) => {
    setIsAuthActionLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.warn("Login error", error);
        return { error: error.message };
      }

      return {};
    } catch (err: any) {
      console.error("Unexpected login error", err);
      return { error: "Unexpected error, please try again." };
    } finally {
      setIsAuthActionLoading(false);
    }
  };

  const signUp: AuthContextValue["signUp"] = async (email, password) => {
    setIsAuthActionLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        console.warn("Sign up error", error);
        return { error: error.message };
      }

      return {};
    } catch (err: any) {
      console.error("Unexpected signup error", err);
      return { error: "Unexpected error, please try again." };
    } finally {
      setIsAuthActionLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Sign out error", err);
    }
  };

  const value: AuthContextValue = {
    user,
    session,
    isInitialLoading,
    isAuthActionLoading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }
  return ctx;
}
