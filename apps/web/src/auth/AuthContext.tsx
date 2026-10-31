import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { authClient } from "./client";
import type { UserProfile } from "./types";

interface AuthState {
  user: UserProfile | null;
  loading: boolean;
  connectionError: string | null;
  restore: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [restoreAttempt, setRestoreAttempt] = useState(0);

  useEffect(
    () =>
      authClient.onSessionExpired(() => {
        setUser(null);
        setConnectionError(null);
      }),
    [],
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    setConnectionError(null);
    authClient
      .restoreSession()
      .then((profile) => {
        if (active) setUser(profile);
      })
      .catch((error: Error) => {
        if (active) setConnectionError(error.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [restoreAttempt]);

  const signIn = useCallback(async (email: string, password: string) => {
    setUser(await authClient.login(email, password));
    setConnectionError(null);
  }, []);

  const signOut = useCallback(async () => {
    await authClient.logout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        connectionError,
        restore: () => setRestoreAttempt((value) => value + 1),
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error("useAuth requires AuthProvider");
  return auth;
}
