/**
 * FlowState — All Clients + Client Detail  (Phase 4)
 *
 * Routes:
 *   /clients                  → list of all clients
 *   /clients/:clientId        → drill-down for a single client
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
  ProgressBar,
  Tag,
} from '../shared/page-shell';
import { useAsync } from '../shared/use-async';
import type { Client, CheckIn, Intervention } from '../shared/types';

// ─── All-clients list ─────────────────────────────────────────────────────────

export function Component() {
  const params = useParams<{ workspaceId: string; clientId?: string }>();

  if (params.clientId) {
    return <ClientDetail clientId={params.clientId} />;
  }
  return <ClientList />;
}

function ClientList() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const { fetchClients } = useFlowStateData();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('active');

  const { data, loading, error, reload } = useAsync<Client[]>(
    () => fetchClients() as Promise<Client[]>,
    [fetchClients]
  );

  const clients = data ?? [];
  const filtered = clients.filter(c => {
    const matchSearch = c.full_name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <PageShell
      title="All Clients"
      subtitle={`${clients.length} total clients`}
      actions={
        <Btn
          onClick={() => navigate(`/workspace/${workspaceId}/onboard`)}
          small
        >
          + Onboard New Client
        </Btn>
      }
    >
      {error && <ErrorBanner message={error} />}

      {/* Filters */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          marginBottom: 20,
          alignItems: 'center',
        }}
      >
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search clients…"
          style={inputStyle}
        />
        <div style={{ display: 'flex', gap: 6 }}>
          {(['all', 'active', 'paused', 'completed'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                padding: '5px 12px',
                borderRadius: 6,
                fontSize: 12,
                border: '1px solid var(--affine-border-color)',
                cursor: 'pointer',
                background:
                  statusFilter === s
                    ? 'var(--affine-primary-color)'
                    : 'var(--affine-background-secondary-color)',
                color:
                  statusFilter === s ? '#fff' : 'var(--affine-text-secondary-color)',
                fontWeight: statusFilter === s ? 600 : 400,
              }}
            >
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <Btn variant="secondary" onClick={reload} small>
          ↻
        </Btn>
      </div>

      {loading ? (
        <LoadingSkeleton rows={6} />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 16,
          }}
        >
          {filtered.map(c => (
            <ClientCard
              key={c.id}
              client={c}
              onClick={() =>
                navigate(`/workspace/${workspaceId}/clients/${c.id}`)
              }
            />
          ))}
          {filtered.length === 0 && (
            <div
              style={{
                gridColumn: '1/-1',
                textAlign: 'center',
                padding: '48px 0',
                color: 'var(--affine-text-secondary-color)',
              }}
            >
              No clients match the current filters.
            </div>
          )}
        </div>
      )}
    </PageShell>
  );
}

function ClientCard({
  client,
  onClick,
}: {
  client: Client;
  onClick: () => void;
}) {
  const adh = client.rolling_7d_adherence;
  const barColor =
    adh >= 90
      ? 'var(--affine-success-color)'
      : adh >= 80
      ? 'var(--affine-warning-color)'
      : 'var(--affine-error-color)';

  return (
    <Card
      style={{ cursor: 'pointer', transition: 'box-shadow 0.15s' }}
    >
      <div
        onClick={onClick}
        style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <div>
            <div
              style={{
                fontWeight: 700,
                fontSize: 15,
                color: 'var(--affine-text-primary-color)',
              }}
            >
              {client.full_name}
            </div>
            <div
              style={{
                fontSize: 12,
                color: 'var(--affine-text-secondary-color)',
                marginTop: 2,
              }}
            >
              Week {client.program_week} · {client.chronotype ?? 'Unknown'}
            </div>
          </div>
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
        </div>

        {/* Adherence */}
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 4,
              fontSize: 11,
              color: 'var(--affine-text-secondary-color)',
            }}
          >
            <span>7-Day Adherence</span>
            <span style={{ fontWeight: 600, color: barColor }}>
              {adh.toFixed(1)}%
            </span>
          </div>
          <ProgressBar value={adh} max={100} color={barColor} />
        </div>

        {/* Flags */}
        {(client.intervention_flag || client.consecutive_missed_checkins > 0) && (
          <div style={{ display: 'flex', gap: 6 }}>
            {client.intervention_flag && (
              <Tag color="red">⚠ Intervention Flagged</Tag>
            )}
            {client.consecutive_missed_checkins >= 2 && (
              <Tag color="amber">
                {client.consecutive_missed_checkins} Missed
              </Tag>
            )}
          </div>
        )}

        <div
          style={{
            fontSize: 12,
            color: 'var(--affine-text-secondary-color)',
          }}
        >
          Program ends{' '}
          {new Date(client.program_end_date).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </div>
      </div>
    </Card>
  );
}

// ─── Single Client Detail ─────────────────────────────────────────────────────

function ClientDetail({ clientId }: { clientId: string }) {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const { fetchClient, fetchCheckIns, fetchClientInterventions, setClientStatus } =
    useFlowStateData();

  const { data: client, loading: loadingClient, error: errorClient } =
    useAsync<Client>(() => fetchClient(clientId) as Promise<Client>, [fetchClient, clientId]);

  const { data: checkIns } = useAsync<CheckIn[]>(
    () => fetchCheckIns(clientId, 1) as Promise<CheckIn[]>,
    [fetchCheckIns, clientId]
  );

  const { data: interventions } = useAsync<Intervention[]>(
    () => fetchClientInterventions(clientId) as Promise<Intervention[]>,
    [fetchClientInterventions, clientId]
  );

  const handleStatusChange = useCallback(
    async (status: string) => {
      await setClientStatus(clientId, status);
    },
    [setClientStatus, clientId]
  );

  if (loadingClient) {
    return (
      <PageShell title="Client Detail">
        <LoadingSkeleton rows={8} />
      </PageShell>
    );
  }

  if (errorClient || !client) {
    return (
      <PageShell title="Client Detail">
        <ErrorBanner message={errorClient ?? 'Client not found.'} />
      </PageShell>
    );
  }

  const adh = client.rolling_7d_adherence;
  const recent = (checkIns ?? []).slice(0, 5);
  const pendingInterv = (interventions ?? []).filter(i => i.status === 'pending').length;

  return (
    <PageShell
      title={client.full_name}
      subtitle={`Week ${client.program_week} · ${client.chronotype ?? 'Unknown chronotype'} · ${client.primary_goal ?? 'No goal set'}`}
      actions={
        <>
          <Btn
            variant="secondary"
            small
            onClick={() => navigate(`/workspace/${workspaceId}/clients`)}
          >
            ← All Clients
          </Btn>
          <select
            defaultValue={client.status}
            onChange={e => void handleStatusChange(e.target.value)}
            style={{
              ...inputStyle,
              width: 'auto',
              padding: '5px 10px',
            }}
          >
            {(['active', 'paused', 'completed'] as const).map(s => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </>
      }
    >
      {/* KPIs */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
        <KpiTile
          label="7-Day Adherence"
          value={adh.toFixed(1)}
          unit="%"
          accent={
            adh >= 90
              ? 'var(--affine-success-color)'
              : adh >= 80
              ? 'var(--affine-warning-color)'
              : 'var(--affine-error-color)'
          }
        />
        <KpiTile label="Program Week" value={client.program_week} unit="/12" />
        <KpiTile
          label="Missed Check-Ins"
          value={client.consecutive_missed_checkins}
          accent={
            client.consecutive_missed_checkins > 0
              ? 'var(--affine-error-color)'
              : undefined
          }
        />
        <KpiTile
          label="Pending Interventions"
          value={pendingInterv}
          accent={pendingInterv > 0 ? 'var(--affine-warning-color)' : undefined}
        />
      </div>

      {/* Two-column layout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 20,
        }}
      >
        {/* Protocol targets */}
        <Card>
          <SectionTitle>Current Protocol Targets</SectionTitle>
          <ProtocolRow label="Wake Time" value={client.target_wake_time} />
          <ProtocolRow label="Bedtime" value={client.target_bedtime} />
          <ProtocolRow label="Caffeine Cutoff" value={client.target_caffeine_cutoff} />
          <ProtocolRow
            label="Morning Light"
            value={`${client.morning_light_duration_min} min`}
          />
          <ProtocolRow label="Exercise" value={client.morning_exercise_time} />
          <ProtocolRow label="Peak Window" value={client.target_peak_window} />
        </Card>

        {/* Recent check-ins */}
        <Card>
          <SectionTitle>Recent Check-Ins</SectionTitle>
          {recent.length === 0 ? (
            <EmptyText>No check-ins recorded yet.</EmptyText>
          ) : (
            recent.map(ci => (
              <div key={ci.id} style={checkInRowStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Tag color={ci.type === 'morning' ? 'blue' : 'neutral'}>
                    {ci.type}
                  </Tag>
                  <span style={{ fontSize: 12, color: 'var(--affine-text-secondary-color)' }}>
                    Wk {ci.program_week} D{ci.program_day}
                  </span>
                </div>
                {ci.adherence_score != null && (
                  <Tag
                    color={
                      ci.adherence_score >= 90
                        ? 'green'
                        : ci.adherence_score >= 70
                        ? 'amber'
                        : 'red'
                    }
                  >
                    {ci.adherence_score}%
                  </Tag>
                )}
              </div>
            ))
          )}
        </Card>
      </div>
    </PageShell>
  );
}

// ─── Micro helpers ────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 12,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: 'var(--affine-text-secondary-color)',
        marginBottom: 12,
      }}
    >
      {children}
    </div>
  );
}

function ProtocolRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '6px 0',
        borderBottom: '1px solid var(--affine-border-color)',
        fontSize: 13,
      }}
    >
      <span style={{ color: 'var(--affine-text-secondary-color)' }}>{label}</span>
      <span style={{ fontWeight: 600, color: 'var(--affine-text-primary-color)' }}>
        {value}
      </span>
    </div>
  );
}

function EmptyText({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 13, color: 'var(--affine-text-secondary-color)' }}>
      {children}
    </p>
  );
}

const checkInRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '8px 0',
  borderBottom: '1px solid var(--affine-border-color)',
};

const inputStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid var(--affine-border-color)',
  background: 'var(--affine-background-secondary-color)',
  color: 'var(--affine-text-primary-color)',
  fontSize: 13,
  outline: 'none',
};
