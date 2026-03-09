/**
 * FlowState — Coach Master Dashboard  (Phase 4)
 *
 * Route: /admin-dashboard (inside coach workspace)
 * Shows all active clients sorted by rolling_7d_adherence ascending,
 * with colour-coded rows: red <80%, yellow 80–90%, green ≥90%.
 */
import { useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useFlowStateData } from '@affine/core/modules/flowstate';

import {
  Btn,
  Card,
  ErrorBanner,
  KpiTile,
  LoadingSkeleton,
  PageShell,
  Tag,
} from '../shared/page-shell';
import { useAsync } from '../shared/use-async';
import type { CoachDashboardRow } from '../shared/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function adherenceColor(pct: number): 'green' | 'amber' | 'red' {
  if (pct >= 90) return 'green';
  if (pct >= 80) return 'amber';
  return 'red';
}

function rowAccent(pct: number): string {
  if (pct >= 90) return 'var(--affine-success-color)';
  if (pct >= 80) return 'var(--affine-warning-color)';
  return 'var(--affine-error-color)';
}

function relativeTime(iso?: string): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return 'Just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Component() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const { fetchCoachDashboard } = useFlowStateData();
  const [search, setSearch] = useState('');

  const { data, loading, error, reload } = useAsync<CoachDashboardRow[]>(
    () =>
      fetchCoachDashboard().then(d => {
        const rows = (d as { clients?: CoachDashboardRow[] })?.clients ?? (d as CoachDashboardRow[]);
        return [...rows].sort(
          (a, b) => a.rolling_7d_adherence - b.rolling_7d_adherence
        );
      }),
    [fetchCoachDashboard]
  );

  const rows = data ?? [];
  const filtered = search
    ? rows.filter(r =>
        r.full_name.toLowerCase().includes(search.toLowerCase())
      )
    : rows;

  const flagged = rows.filter(r => r.intervention_flag).length;
  const avgAdh =
    rows.length > 0
      ? (rows.reduce((s, r) => s + r.rolling_7d_adherence, 0) / rows.length).toFixed(1)
      : '—';
  const active = rows.filter(r => r.status === 'active').length;

  const goClient = useCallback(
    (id: string) => {
      navigate(`/workspace/${workspaceId}/clients/${id}`);
    },
    [navigate, workspaceId]
  );

  return (
    <PageShell
      title="Master Dashboard"
      subtitle="All clients — sorted by 7-day adherence"
      actions={
        <>
          <Btn variant="secondary" onClick={reload} small>
            ↻ Refresh
          </Btn>
          <Btn
            onClick={() => navigate(`/workspace/${workspaceId}/onboard`)}
            small
          >
            + Onboard Client
          </Btn>
        </>
      }
    >
      {error && <ErrorBanner message={error} />}

      {/* KPI bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <KpiTile label="Active Clients" value={active} />
        <KpiTile label="Avg 7-Day Adherence" value={avgAdh} unit="%" />
        <KpiTile
          label="Intervention Flags"
          value={flagged}
          accent={flagged > 0 ? 'var(--affine-error-color)' : undefined}
        />
        <KpiTile label="Total Clients" value={rows.length} />
      </div>

      {/* Search */}
      <div style={{ marginBottom: 16 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search clients…"
          style={inputStyle}
        />
      </div>

      {/* Table */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 24 }}>
            <LoadingSkeleton rows={6} />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={theadRowStyle}>
                {['Client', 'Week', 'Chronotype', '7-Day Adh.', 'Missed', 'Last Check-In', 'Status', ''].map(
                  h => (
                    <th key={h} style={thStyle}>
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((client, idx) => {
                const acc = rowAccent(client.rolling_7d_adherence);
                return (
                  <tr
                    key={client.id}
                    style={{
                      ...tdRowStyle,
                      background: idx % 2 === 0 ? undefined : 'var(--affine-background-primary-color)',
                      borderLeft: `3px solid ${acc}`,
                    }}
                    onClick={() => goClient(client.id)}
                  >
                    <td style={{ ...tdStyle, fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {client.intervention_flag && (
                          <span title="Intervention flagged" style={{ color: 'var(--affine-error-color)', fontSize: 14 }}>
                            ⚠
                          </span>
                        )}
                        {client.full_name}
                      </div>
                    </td>
                    <td style={tdStyle}>Wk {client.program_week}</td>
                    <td style={tdStyle}>
                      <Tag color="neutral">{client.chronotype ?? '—'}</Tag>
                    </td>
                    <td style={tdStyle}>
                      <Tag color={adherenceColor(client.rolling_7d_adherence)}>
                        {client.rolling_7d_adherence.toFixed(1)}%
                      </Tag>
                    </td>
                    <td style={tdStyle}>
                      {client.consecutive_missed_checkins > 0 ? (
                        <Tag color="red">{client.consecutive_missed_checkins}</Tag>
                      ) : (
                        <span style={{ color: 'var(--affine-text-disable-color)' }}>0</span>
                      )}
                    </td>
                    <td style={{ ...tdStyle, color: 'var(--affine-text-secondary-color)', fontSize: 12 }}>
                      {relativeTime(client.last_checkin_at)}
                    </td>
                    <td style={tdStyle}>
                      <Tag
                        color={
                          client.status === 'active'
                            ? 'green'
                            : client.status === 'paused'
                            ? 'amber'
                            : 'neutral'
                        }
                      >
                        {client.status}
                      </Tag>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <Btn variant="ghost" small onClick={e => { e.stopPropagation(); goClient(client.id); }}>
                        View →
                      </Btn>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </PageShell>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        padding: '48px 24px',
        textAlign: 'center',
        color: 'var(--affine-text-secondary-color)',
        fontSize: 14,
      }}
    >
      No clients found.
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 320,
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid var(--affine-border-color)',
  background: 'var(--affine-background-secondary-color)',
  color: 'var(--affine-text-primary-color)',
  fontSize: 13,
  outline: 'none',
};

const theadRowStyle: React.CSSProperties = {
  background: 'var(--affine-background-tertiary-color)',
};

const thStyle: React.CSSProperties = {
  padding: '10px 16px',
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  color: 'var(--affine-text-secondary-color)',
  borderBottom: '1px solid var(--affine-border-color)',
};

const tdRowStyle: React.CSSProperties = {
  cursor: 'pointer',
  transition: 'background 0.1s',
};

const tdStyle: React.CSSProperties = {
  padding: '12px 16px',
  fontSize: 13,
  color: 'var(--affine-text-primary-color)',
  borderBottom: '1px solid var(--affine-border-color)',
  verticalAlign: 'middle',
};
