// src/features/auth/AuthProvider.tsx
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/src/lib/supabase";
import { registerPushToken } from "@/src/lib/registerPushToken";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isAuthActionLoading: boolean;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthActionLoading, setIsAuthActionLoading] = useState(false);
  const [isHydrating, setIsHydrating] = useState(true);

  // Push token registration — fire once per distinct authenticated user.
  // Tracks the last user ID for which we attempted registration so that session
  // token refreshes (same user, new JWT) don't trigger unnecessary re-registrations.
  const registeredForUserId = useRef<string | null>(null);

  useEffect(() => {
    const userId = user?.id ?? null;
    if (!userId) return;
    if (registeredForUserId.current === userId) return;

    registeredForUserId.current = userId;
    // Best-effort, non-blocking. registerPushToken never throws.
    void registerPushToken();
  }, [user?.id]);

  // Initial session hydration (from AsyncStorage/web localStorage via supabase client config)
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error("[Auth] getSession error:", error);
        }
        if (!mounted) return;

        const nextSession = data?.session ?? null;
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
      } catch (e) {
        console.error("[Auth] getSession threw:", e);
      } finally {
        if (mounted) setIsHydrating(false);
      }
    })();

    // Subscribe to auth changes
    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
    });
    
    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe();
    };
  }, []);

  const signUpWithEmail = async (email: string, password: string) => {
    setIsAuthActionLoading(true);
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      // Note: depending on Supabase email confirmation settings,
      // user may need to confirm via email before session is active.
    } catch (e) {
      console.error("[Auth] signUpWithEmail error:", e);
      // Keep UX simple; you can swap to a toast/banner later
      alert(e instanceof Error ? e.message : "Sign up failed");
    } finally {
      setIsAuthActionLoading(false);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    setIsAuthActionLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (e) {
      console.error("[Auth] signInWithEmail error:", e);
      alert(e instanceof Error ? e.message : "Sign in failed");
    } finally {
      setIsAuthActionLoading(false);
    }
  };

  const signOut = async () => {
    setIsAuthActionLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      // onAuthStateChange will handle clearing session/user
    } catch (e) {
      console.error("[Auth] signOut error:", e);
      alert(e instanceof Error ? e.message : "Sign out failed");
    } finally {
      setIsAuthActionLoading(false);
    }
  };

  const value = useMemo<AuthContextValue>(() => {
    const isAuthenticated = Boolean(session?.user?.id);
    return {
      user,
      session,
      isAuthenticated,
      isAuthActionLoading: isAuthActionLoading || isHydrating,
      signUpWithEmail,
      signInWithEmail,
      signOut,
    };
  }, [user, session, isAuthActionLoading, isHydrating]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider />");
  return ctx;
}