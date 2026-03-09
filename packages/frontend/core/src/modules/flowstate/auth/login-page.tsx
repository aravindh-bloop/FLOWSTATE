/**
 * FlowState — Login page.
 *
 * Replaces Affine's sign-in screen with a simple
 * email/password form that authenticates via BetterAuth.
 */

import { useCallback, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { useFlowStateAuth } from './context';

export function LoginPage() {
  const { login, loading, error } = useFlowStateAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      try {
        await login(email, password);
        navigate('/', { replace: true });
      } catch {
        // error is set in context — displayed below
      }
    },
    [login, email, password, navigate]
  );

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--affine-background-primary-color)',
      }}
    >
      <div
        style={{
          width: 380,
          padding: '40px 32px',
          background: 'var(--affine-background-secondary-color)',
          borderRadius: 16,
          boxShadow: 'var(--affine-menu-shadow)',
        }}
      >
        {/* Branding */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: 'var(--affine-text-primary-color)',
              letterSpacing: '-0.5px',
            }}
          >
            FlowState
          </div>
          <div
            style={{
              fontSize: 13,
              color: 'var(--affine-text-secondary-color)',
              marginTop: 4,
            }}
          >
            90-day human performance coaching
          </div>
        </div>

        <form onSubmit={e => void handleSubmit(e)}>
          <div style={{ marginBottom: 16 }}>
            <label
              htmlFor="fs-email"
              style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--affine-text-secondary-color)',
                marginBottom: 6,
              }}
            >
              Email
            </label>
            <input
              id="fs-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1.5px solid var(--affine-border-color)',
                background: 'var(--affine-background-primary-color)',
                color: 'var(--affine-text-primary-color)',
                fontSize: 14,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label
              htmlFor="fs-password"
              style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--affine-text-secondary-color)',
                marginBottom: 6,
              }}
            >
              Password
            </label>
            <input
              id="fs-password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1.5px solid var(--affine-border-color)',
                background: 'var(--affine-background-primary-color)',
                color: 'var(--affine-text-primary-color)',
                fontSize: 14,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {error && (
            <div
              style={{
                marginBottom: 16,
                padding: '10px 12px',
                borderRadius: 8,
                background: 'var(--affine-background-error-color)',
                color: 'var(--affine-error-color)',
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '11px 0',
              borderRadius: 8,
              border: 'none',
              background: 'var(--affine-primary-color)',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
