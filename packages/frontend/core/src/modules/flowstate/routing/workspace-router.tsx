/**
 * FlowState — Role-based workspace routing.
 *
 * Reads the authenticated user's role from FlowStateAuthProvider and
 * redirects them to the correct workspace:
 *
 *   role = 'coach'  →  /workspace/coach-admin  (Master Dashboard + all admin pages)
 *   role = 'client' →  /workspace/<affine_workspace_id>  (their own portal)
 *
 * Used as the root route element. Renders a loading state while the
 * session is being established, then redirects.
 */

import { type ReactNode } from 'react';
import { Navigate, Outlet } from 'react-router-dom';

import { useFlowStateAuth } from '../auth/context';
import { LoginPage } from '../auth/login-page';

// ─── Coach workspace slug ─────────────────────────────────────────────────────
// The coach's Affine workspace has a fixed ID configured via env var.
// Falls back to the literal slug "coach-admin" for dev convenience.
const COACH_WORKSPACE_ID =
  (import.meta as unknown as { env: Record<string, string> }).env
    .VITE_COACH_WORKSPACE_ID ?? 'coach-admin';

// ─── Route guards ─────────────────────────────────────────────────────────────

/**
 * Guards any route that requires the user to be authenticated.
 * Renders the login page while loading, redirects unauthenticated users.
 */
export function RequireAuth({ children }: { children?: ReactNode }) {
  const { user, loading } = useFlowStateAuth();

  if (loading) return <AuthLoadingScreen />;
  if (!user) return <LoginPage />;

  return children ? <>{children}</> : <Outlet />;
}

/**
 * Guards routes accessible only to coaches.
 * Redirects clients to their own workspace.
 */
export function RequireCoach({ children }: { children?: ReactNode }) {
  const { user, loading } = useFlowStateAuth();

  if (loading) return <AuthLoadingScreen />;
  if (!user) return <LoginPage />;
  if (user.role !== 'coach') {
    return <ClientWorkspaceRedirect />;
  }

  return children ? <>{children}</> : <Outlet />;
}

/**
 * Root redirect: sends the user to the correct workspace based on role.
 * Mount this as the index route ("/").
 */
export function RootRedirect() {
  const { user, loading } = useFlowStateAuth();

  if (loading) return <AuthLoadingScreen />;
  if (!user) return <LoginPage />;

  if (user.role === 'coach') {
    return (
      <Navigate to={`/workspace/${COACH_WORKSPACE_ID}`} replace />
    );
  }

  // Client: their workspaceId comes from the session user object.
  // The backend embeds it in the /api/auth/me response as `workspaceId`.
  const workspaceId =
    (user as unknown as { workspaceId?: string }).workspaceId ?? user.id;
  return <Navigate to={`/workspace/${workspaceId}`} replace />;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function ClientWorkspaceRedirect() {
  const { user } = useFlowStateAuth();
  const workspaceId =
    (user as unknown as { workspaceId?: string }).workspaceId ?? user?.id ?? '';
  return <Navigate to={`/workspace/${workspaceId}`} replace />;
}

function AuthLoadingScreen() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--affine-background-primary-color)',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div
        style={{
          fontSize: 20,
          fontWeight: 700,
          color: 'var(--affine-text-primary-color)',
        }}
      >
        FlowState
      </div>
      <div
        style={{
          fontSize: 13,
          color: 'var(--affine-text-secondary-color)',
        }}
      >
        Loading your workspace…
      </div>
    </div>
  );
}
