/**
 * FlowState — PageShell.
 *
 * Common layout wrapper for all FlowState workspace pages.
 * Provides a header (title + optional actions) and a scrollable content area,
 * both styled with the FlowState CSS variable palette.
 */
import { type CSSProperties, type ReactNode } from 'react';

interface PageShellProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  noPadding?: boolean;
}

export function PageShell({
  title,
  subtitle,
  actions,
  children,
  noPadding,
}: PageShellProps) {
  return (
    <div style={styles.root}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>{title}</h1>
          {subtitle && <p style={styles.subtitle}>{subtitle}</p>}
        </div>
        {actions && <div style={styles.actions}>{actions}</div>}
      </div>
      <div style={{ ...styles.content, ...(noPadding ? { padding: 0 } : {}) }}>
        {children}
      </div>
    </div>
  );
}

// ─── Shared micro-components ──────────────────────────────────────────────────

export function Btn({
  children,
  onClick,
  variant = 'primary',
  disabled,
  small,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  small?: boolean;
}) {
  const base: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: small ? '5px 12px' : '8px 16px',
    borderRadius: 8,
    fontSize: small ? 12 : 13,
    fontWeight: 500,
    cursor: disabled ? 'not-allowed' : 'pointer',
    border: 'none',
    transition: 'opacity 0.15s',
    opacity: disabled ? 0.5 : 1,
    lineHeight: '1.4',
  };
  const variants: Record<string, CSSProperties> = {
    primary: {
      background: 'var(--affine-primary-color)',
      color: '#fff',
    },
    secondary: {
      background: 'var(--affine-background-tertiary-color)',
      color: 'var(--affine-text-primary-color)',
      border: '1px solid var(--affine-border-color)',
    },
    danger: {
      background: 'var(--affine-background-error-color)',
      color: 'var(--affine-error-color)',
      border: '1px solid var(--affine-error-color)',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--affine-text-secondary-color)',
    },
  };
  return (
    <button
      style={{ ...base, ...variants[variant] }}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        background: 'var(--affine-background-secondary-color)',
        border: '1px solid var(--affine-border-color)',
        borderRadius: 12,
        padding: '20px 24px',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function KpiTile({
  label,
  value,
  unit,
  accent,
}: {
  label: string;
  value: string | number;
  unit?: string;
  accent?: string;
}) {
  return (
    <Card style={{ flex: '1 1 160px' }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'var(--affine-text-secondary-color)',
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: accent ?? 'var(--affine-text-primary-color)',
          lineHeight: 1,
        }}
      >
        {value}
        {unit && (
          <span style={{ fontSize: 14, fontWeight: 500, marginLeft: 3 }}>
            {unit}
          </span>
        )}
      </div>
    </Card>
  );
}

export function Tag({
  children,
  color,
}: {
  children: ReactNode;
  color?: 'green' | 'amber' | 'red' | 'blue' | 'neutral';
}) {
  const colors: Record<string, CSSProperties> = {
    green: {
      background: 'var(--affine-background-success-color)',
      color: 'var(--affine-success-color)',
    },
    amber: {
      background: 'var(--affine-background-warning-color)',
      color: 'var(--affine-warning-color)',
    },
    red: {
      background: 'var(--affine-background-error-color)',
      color: 'var(--affine-error-color)',
    },
    blue: {
      background: 'rgba(59,130,246,0.1)',
      color: '#3b82f6',
    },
    neutral: {
      background: 'var(--affine-background-tertiary-color)',
      color: 'var(--affine-text-secondary-color)',
    },
  };
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 600,
        ...(colors[color ?? 'neutral'] ?? colors.neutral),
      }}
    >
      {children}
    </span>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      style={{
        background: 'var(--affine-background-error-color)',
        color: 'var(--affine-error-color)',
        border: '1px solid var(--affine-error-color)',
        borderRadius: 8,
        padding: '12px 16px',
        fontSize: 13,
        marginBottom: 16,
      }}
    >
      {message}
    </div>
  );
}

export function LoadingSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          style={{
            height: 44,
            borderRadius: 8,
            background: 'var(--affine-background-tertiary-color)',
            animation: 'pulse 1.5s ease-in-out infinite',
            opacity: 1 - i * 0.15,
          }}
        />
      ))}
    </div>
  );
}

export function ProgressBar({
  value,
  max = 100,
  color,
}: {
  value: number;
  max?: number;
  color?: string;
}) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div
      style={{
        height: 6,
        borderRadius: 3,
        background: 'var(--affine-border-color)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${pct}%`,
          borderRadius: 3,
          background: color ?? 'var(--affine-primary-color)',
          transition: 'width 0.3s ease',
        }}
      />
    </div>
  );
}

/** Simple SVG spark-line from an array of numbers */
export function SparkLine({
  values,
  width = 120,
  height = 32,
  color,
}: {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
}) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - ((v - min) / range) * height * 0.85 - height * 0.075;
      return `${x},${y}`;
    })
    .join(' ');
  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      <polyline
        points={pts}
        fill="none"
        stroke={color ?? 'var(--affine-primary-color)'}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles: Record<string, CSSProperties> = {
  root: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--affine-background-primary-color)',
    overflow: 'hidden',
  },
  header: {
    padding: '22px 32px 16px',
    borderBottom: '1px solid var(--affine-border-color)',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    flexShrink: 0,
  },
  title: {
    margin: 0,
    fontSize: 20,
    fontWeight: 700,
    color: 'var(--affine-text-primary-color)',
    lineHeight: 1.2,
  },
  subtitle: {
    margin: '4px 0 0',
    fontSize: 13,
    color: 'var(--affine-text-secondary-color)',
  },
  actions: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px 32px',
  },
};
