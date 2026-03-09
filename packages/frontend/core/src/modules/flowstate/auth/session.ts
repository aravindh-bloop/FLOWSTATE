/**
 * FlowState — BetterAuth session management.
 *
 * Replaces Affine's native account/cloud auth system.
 * Reads a JWT session from the BetterAuth API and exposes it
 * as a React-compatible store so the rest of the app can read
 * the current user and role without touching Affine internals.
 */

export interface FlowStateUser {
  id: string;
  email: string;
  name: string;
  role: 'coach' | 'client';
}

export interface FlowStateSession {
  user: FlowStateUser | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

const API_URL = (import.meta as unknown as { env: Record<string, string> }).env
  .NEXT_PUBLIC_API_URL ?? '';

// ─── Token storage ───────────────────────────────────────────────────────────

const TOKEN_KEY = 'flowstate_token';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // ignore — storage may be unavailable in some contexts
  }
}

export function clearStoredToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

// ─── API calls ───────────────────────────────────────────────────────────────

/**
 * Fetch the current session from BetterAuth.
 * Returns the user object and token if authenticated, null otherwise.
 */
export async function fetchSession(): Promise<{
  user: FlowStateUser;
  token: string;
} | null> {
  const token = getStoredToken();
  if (!token) return null;

  try {
    const res = await fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      if (res.status === 401) clearStoredToken();
      return null;
    }
    const user: FlowStateUser = await res.json();
    return { user, token };
  } catch {
    return null;
  }
}

/**
 * Log in with email + password via BetterAuth.
 * Stores the returned JWT in localStorage on success.
 */
export async function loginWithCredentials(
  email: string,
  password: string
): Promise<{ user: FlowStateUser; token: string }> {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? 'Login failed');
  }

  const data: { user: FlowStateUser; token: string } = await res.json();
  setStoredToken(data.token);
  return data;
}

/**
 * Log out — clears local token and calls the server to invalidate the session.
 */
export async function logout(): Promise<void> {
  const token = getStoredToken();
  clearStoredToken();
  if (!token) return;

  await fetch(`${API_URL}/api/auth/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => {
    // best-effort — local token is already cleared
  });
}
