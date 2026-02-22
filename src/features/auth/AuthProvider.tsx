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
import AsyncStorage from "@react-native-async-storage/async-storage";


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
const GUEST_FLAG_KEY = "safesteps_guest";

async function readGuestFlag(): Promise<boolean> {
  try {
    if (Platform.OS === "web") {
      return localStorage.getItem(GUEST_FLAG_KEY) === "1";
    }
    return (await AsyncStorage.getItem(GUEST_FLAG_KEY)) === "1";
  } catch {
    return false;
  }
}

async function writeGuestFlag(on: boolean): Promise<void> {
  try {
    if (Platform.OS === "web") {
      if (on) localStorage.setItem(GUEST_FLAG_KEY, "1");
      else localStorage.removeItem(GUEST_FLAG_KEY);
      return;
    }
    if (on) await AsyncStorage.setItem(GUEST_FLAG_KEY, "1");
    else await AsyncStorage.removeItem(GUEST_FLAG_KEY);
  } catch {
    // ignore
  }
}


export function AuthProvider({ children }: { children: ReactNode }) {

  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [guestMode, setGuestMode] = useState<boolean>(false);

  const [isAuthLoaded, setIsAuthLoaded] = useState<boolean>(false);
  const [isAuthActionLoading, setIsAuthActionLoading] =
    useState<boolean>(false);

  const ensuringRef = React.useRef<Set<string>>(new Set());

  const ensureProfileRow = React.useCallback(async (u: User) => {
    // Prevent duplicate upserts for same user in this app session
    if (ensuringRef.current.has(u.id)) return;
    ensuringRef.current.add(u.id);
    

    const payload = {
      user_id: u.id,
      email: u.email ?? null,
      display_name: (u.user_metadata as any)?.display_name ?? null,
    };

    const { error } = await supabase
      .from("profiles")
      .upsert(payload, { onConflict: "user_id" });
      

    if (error) {
      console.warn("[AuthProvider] ensureProfileRow failed:", error.message, payload);
      ensuringRef.current.delete(u.id); // allow retry later
    } else {
      console.log("[AuthProvider] ensureProfileRow OK", { user_id: u.id });
    }
  }, []);





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
        console.log("ACCESS_TOKEN", session?.access_token);


        if (session?.user) {
          void ensureProfileRow(session.user);
        }

        // ✅ Restore guest on web refresh if no real session exists
        // ✅ Restore guest flag (web + native) if no real session exists
        const storedGuest = await readGuestFlag();

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

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession ?? null);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        void ensureProfileRow(newSession.user);

        setGuestMode(false);
        void writeGuestFlag(false);
        console.log("[AuthProvider] Supabase user session detected → disabling guestMode");
      }
    });



    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [ensureProfileRow]);

  // --- Guest Mode API ---


  const startGuestSession = useCallback(async () => {
    console.log("[AuthProvider] startGuestSession called");

    // Set guest first so the UI/guard never sees "no session"
    setGuestMode(true);
    setSession(null);
    setUser(null);
    await writeGuestFlag(true);

    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn("[AuthProvider] signOut during guest start failed:", err);
    }
  }, []);






  const endGuestSession = useCallback(async () => {
    console.log("[AuthProvider] endGuestSession called");
    await writeGuestFlag(false);

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

        if (data.user) {
          void ensureProfileRow(data.user);
        }
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

        if (data.user) {
          void ensureProfileRow(data.user);
        }

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
    console.log("[AuthProvider] signOut called");

    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.warn("[AuthProvider] signOut error:", error.message);
        Alert.alert("Log out failed", error.message);
      }

      setSession(null);
      setUser(null);

      // ❌ Do NOT setGuestMode(false) here.
      // Logging out should return to the login screen, but not interfere with
      // the user's ability to start a guest session immediately after.

      // ✅ Clear persisted guest flag only if you're explicitly leaving guest (handled in endGuestSession)
      // so do nothing here.
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
