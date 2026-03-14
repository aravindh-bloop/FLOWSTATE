'use client';

import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'coach' | 'client';
}

interface SessionState {
  user: User | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const SessionContext = createContext<SessionState>({
  user: null,
  loading: true,
  refresh: async () => {},
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const token = localStorage.getItem('fs_token') ?? '';
      const res = await fetch(`${API_URL}/api/auth/me`, {
        credentials: 'include',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (res.ok) {
        const data = await res.json();
        // /api/auth/me returns flat { id, email, name, role, mustChangePassword, workspaceId }
        setUser(data ? { id: data.id, email: data.email, name: data.name, role: data.role } : null);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <SessionContext value={{ user, loading, refresh }}>
      {children}
    </SessionContext>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
