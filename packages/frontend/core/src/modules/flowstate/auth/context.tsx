/**
 * FlowState — Auth context.
 *
 * Wraps the app and provides the current BetterAuth session
 * to all children via React context. Replaces Affine's cloud
 * account system entirely.
 *
 * Usage:
 *   const { user, loading, login, logout } = useFlowStateAuth();
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

import {
  fetchSession,
  loginWithCredentials,
  logout as sessionLogout,
  type FlowStateUser,
} from './session';

// ─── Context shape ────────────────────────────────────────────────────────────

interface AuthContextValue {
  user: FlowStateUser | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function FlowStateAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FlowStateUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const session = await fetchSession();
      if (session) {
        setUser(session.user);
        setToken(session.token);
      } else {
        setUser(null);
        setToken(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Session error');
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load session on mount
  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      setError(null);
      try {
        const { user: u, token: t } = await loginWithCredentials(
          email,
          password
        );
        setUser(u);
        setToken(t);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Login failed';
        setError(msg);
        throw new Error(msg);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const logout = useCallback(async () => {
    await sessionLogout();
    setUser(null);
    setToken(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, token, loading, error, login, logout, refresh }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useFlowStateAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error(
      'useFlowStateAuth must be used inside <FlowStateAuthProvider>'
    );
  }
  return ctx;
}
