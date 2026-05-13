// src/features/auth/AuthProvider.tsx
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/src/lib/supabase";
import { registerPushToken } from "@/src/lib/registerPushToken";
import { readJson, writeJson } from "@/src/lib/storage";
import { log } from "@/src/lib/logger";

const GUEST_FLAG_KEY = "safesteps_guest";

async function readGuestFlag(): Promise<boolean> {
  try {
    const val = await readJson<boolean>(GUEST_FLAG_KEY, false);
    return val === true;
  } catch {
    return false;
  }
}

async function writeGuestFlag(on: boolean): Promise<void> {
  await writeJson(GUEST_FLAG_KEY, on).catch(() => {});
}

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  hasSession: boolean;
  isAuthLoaded: boolean;
  isAuthActionLoading: boolean;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  startGuestSession: () => Promise<void>;
  endGuestSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [guestMode, setGuestMode] = useState(false);
  const [isAuthActionLoading, setIsAuthActionLoading] = useState(false);
  const [isHydrating, setIsHydrating] = useState(true);

  const registeredForUserId = useRef<string | null>(null);

  useEffect(() => {
    const userId = user?.id ?? null;
    if (!userId) return;
    if (registeredForUserId.current === userId) return;

    registeredForUserId.current = userId;
    void registerPushToken();
  }, [user?.id]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) log.error("auth", "getSession error", error);
        if (!mounted) return;

        const nextSession = data?.session ?? null;
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
        log.info("auth", "session hydrated", { userId: nextSession?.user?.id ?? null });

        // Only restore guest flag if there is no real session
        if (!nextSession) {
          const storedGuest = await readGuestFlag();
          if (storedGuest) {
            setGuestMode(true);
            log.info("auth", "guest flag restored");
          }
        }
      } catch (e) {
        log.error("auth", "getSession threw", e);
      } finally {
        if (mounted) setIsHydrating(false);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      log.info("auth", "auth state change", { event, userId: nextSession?.user?.id ?? null });
      // Only clear guest mode when a real authenticated user appears — NOT on SIGNED_OUT
      if (nextSession?.user) {
        setGuestMode(false);
        void writeGuestFlag(false);
      }
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe();
    };
  }, []);

  const signUpWithEmail = async (email: string, password: string) => {
    setIsAuthActionLoading(true);
    log.info("auth", "sign up attempt");
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      log.info("auth", "sign up ok");
    } catch (e) {
      log.error("auth", "sign up error", e);
      alert(e instanceof Error ? e.message : "Sign up failed");
    } finally {
      setIsAuthActionLoading(false);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    setIsAuthActionLoading(true);
    log.info("auth", "sign in attempt");
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      log.info("auth", "sign in ok");
    } catch (e) {
      log.error("auth", "sign in error", e);
      alert(e instanceof Error ? e.message : "Sign in failed");
    } finally {
      setIsAuthActionLoading(false);
    }
  };

  const signOut = async () => {
    setIsAuthActionLoading(true);
    log.info("auth", "sign out");
    try {
      await supabase.auth.signOut();
      setGuestMode(false);
      await writeGuestFlag(false);
    } catch (e) {
      log.error("auth", "sign out error", e);
      alert(e instanceof Error ? e.message : "Sign out failed");
    } finally {
      setIsAuthActionLoading(false);
    }
  };

  const startGuestSession = async () => {
    setIsAuthActionLoading(true);
    log.info("auth", "guest session start");
    try {
      await supabase.auth.signOut().catch(() => {});
      setSession(null);
      setUser(null);
      setGuestMode(true);
      await writeGuestFlag(true);
    } finally {
      setIsAuthActionLoading(false);
    }
  };

  const endGuestSession = async () => {
    setIsAuthActionLoading(true);
    log.info("auth", "guest session end");
    try {
      setGuestMode(false);
      await writeGuestFlag(false);
      // Note: caller (settings screen) is responsible for calling stopAll() before this
    } finally {
      setIsAuthActionLoading(false);
    }
  };

  const value = useMemo<AuthContextValue>(() => {
    const isAuthenticated = Boolean(session?.user?.id);
    const isGuest = guestMode && !isAuthenticated;
    const hasSession = isAuthenticated || isGuest;

    return {
      user,
      session,
      isAuthenticated,
      isGuest,
      hasSession,
      isAuthLoaded: !isHydrating,
      isAuthActionLoading: isAuthActionLoading || isHydrating,
      signUpWithEmail,
      signInWithEmail,
      signOut,
      startGuestSession,
      endGuestSession,
    };
  }, [user, session, guestMode, isAuthActionLoading, isHydrating]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider />");
  return ctx;
}
