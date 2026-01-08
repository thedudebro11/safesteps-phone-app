// src/features/auth/AuthProvider.tsx
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import { Alert, Platform } from "react-native";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/src/lib/supabase"; // adjust path if needed

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  isAuthLoaded: boolean;
  isAuthActionLoading: boolean;

  // Guest mode
  guestMode: boolean;
  startGuestSession: () => Promise<void>;

  endGuestSession: () => Promise<void>;

  // Derived helpers
  isGuest: boolean;
  isAuthenticated: boolean; // Supabase user
  hasSession: boolean; // guest OR supabase user

  // Auth actions
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [guestMode, setGuestMode] = useState<boolean>(false);

  const [isAuthLoaded, setIsAuthLoaded] = useState<boolean>(false);
  const [isAuthActionLoading, setIsAuthActionLoading] =
    useState<boolean>(false);

  // --- Load initial Supabase session ---
  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (error) {
          console.warn("[AuthProvider] getSession error:", error.message);
        }

        setSession(session ?? null);
        setUser(session?.user ?? null);

        // ✅ Restore guest on web refresh if no real session exists
        const storedGuest =
          Platform.OS === "web" && localStorage.getItem("safesteps_guest") === "1";

        if (!session?.user && storedGuest) {
          setSession(null);
          setUser(null);
          setGuestMode(true);
        }
      } catch (err) {
        console.warn("[AuthProvider] unexpected getSession error:", err);
      } finally {
        if (isMounted) setIsAuthLoaded(true);
      }
    };


    loadSession();

    const {
      data: authListener,
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession ?? null);
      setUser(newSession?.user ?? null);
      // If a real Supabase session appears, we should exit guest mode
      if (newSession?.user) {
        setGuestMode(false);
      }
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  // --- Guest Mode API ---


  const startGuestSession = useCallback(async () => {
    // Kill any persisted Supabase session so it can’t “pop back in”
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn("[AuthProvider] signOut during guest start failed:", err);
    }

    // Clear local state and enter guest mode
    setSession(null);
    setUser(null);
    setGuestMode(true);

    if (Platform.OS === "web") {
      localStorage.setItem("safesteps_guest", "1");
    }
  }, []);





  const endGuestSession = useCallback(async () => {
    setGuestMode(false);

    // ✅ Clear persisted guest flag (web)
    if (Platform.OS === "web") {
      localStorage.removeItem("safesteps_guest");
    }
  }, []);


  // --- Auth Actions ---

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      setIsAuthActionLoading(true);
      try {
        // If they were in guest mode, disable it on real login
        setGuestMode(false);

        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          console.warn("[AuthProvider] signIn error:", error.message);
          Alert.alert("Sign in failed", error.message);
          return;
        }

        setSession(data.session ?? null);
        setUser(data.user ?? null);
      } catch (err) {
        console.warn("[AuthProvider] unexpected signIn error:", err);
        Alert.alert("Sign in failed", "Unexpected error. Please try again.");
      } finally {
        setIsAuthActionLoading(false);
      }
    },
    []
  );

  const signUpWithEmail = useCallback(
    async (email: string, password: string) => {
      setIsAuthActionLoading(true);
      try {
        setGuestMode(false);

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) {
          console.warn("[AuthProvider] signUp error:", error.message);
          Alert.alert("Sign up failed", error.message);
          return;
        }

        setSession(data.session ?? null);
        setUser(data.user ?? null);
      } catch (err) {
        console.warn("[AuthProvider] unexpected signUp error:", err);
        Alert.alert("Sign up failed", "Unexpected error. Please try again.");
      } finally {
        setIsAuthActionLoading(false);
      }
    },
    []
  );

  const signOut = useCallback(async () => {
    setIsAuthActionLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.warn("[AuthProvider] signOut error:", error.message);
        Alert.alert("Log out failed", error.message);
      }

      setSession(null);
      setUser(null);
      setGuestMode(false);

      // ✅ Clear persisted guest flag (web)
      if (Platform.OS === "web") {
        localStorage.removeItem("safesteps_guest");
      }
    } catch (err) {
      console.warn("[AuthProvider] unexpected signOut error:", err);
      Alert.alert("Log out failed", "Unexpected error. Please try again.");
    } finally {
      setIsAuthActionLoading(false);
    }
  }, []);


  const value: AuthContextValue = useMemo(() => {
    const isAuthenticated = !!user;
    const isGuest = guestMode && !user;
    const hasSession = isAuthenticated || isGuest;

    return {
      user,
      session,
      isAuthLoaded,
      isAuthActionLoading,

      guestMode,
      startGuestSession,
      endGuestSession,

      isGuest,
      isAuthenticated,
      hasSession,

      signInWithEmail,
      signUpWithEmail,
      signOut,
    };
  }, [
    user,
    session,
    isAuthLoaded,
    isAuthActionLoading,
    guestMode,
    startGuestSession,
    endGuestSession,
    signInWithEmail,
    signUpWithEmail,
    signOut,
  ]);

  React.useEffect(() => {
    console.log("[Auth] state changed", {
      hasSession: value.hasSession,
      isGuest: value.isGuest,
      isAuthenticated: value.isAuthenticated,
      guestMode,
      hasUser: !!user,
    });
  }, [value.hasSession, value.isGuest, value.isAuthenticated, guestMode, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
