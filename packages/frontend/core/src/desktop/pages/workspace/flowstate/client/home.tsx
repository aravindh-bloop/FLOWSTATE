/**
 * FlowState — Client Home / Dashboard  (Phase 5)
 *
 * Route: /home (inside client workspace)
 * Shows KPI tiles, this-week targets, last 3 check-ins, and
 * upcoming calendar events — all driven from GET /api/dashboard/client.
 */

import {
  useFlowStateAuth,
  useFlowStateData,
} from '@affine/core/modules/flowstate';

import {
  Card,
  ErrorBanner,
  KpiTile,
  LoadingSkeleton,
  PageShell,
  ProgressBar,
  Tag,
} from '../shared/page-shell';
import type { ClientDashboard } from '../shared/types';
import { useAsync } from '../shared/use-async';

// ─── Component ────────────────────────────────────────────────────────────────

export function Component() {
  const { user } = useFlowStateAuth();
  const { fetchClientDashboard } = useFlowStateData();

  const { data, loading, error } = useAsync<ClientDashboard>(
    () => fetchClientDashboard() as Promise<ClientDashboard>,
    [fetchClientDashboard]
  );

  if (loading) {
    return (
      <PageShell title="Dashboard">
        <LoadingSkeleton rows={6} />
      </PageShell>
    );
  }

  if (error || !data) {
    return (
      <PageShell title="Dashboard">
        <ErrorBanner message={error ?? 'Could not load dashboard data.'} />
      </PageShell>
    );
  }

  const { client, kpis, this_week_targets, recent_checkins, upcoming_events } =
    data;
  const firstName = (user?.name ?? client.full_name).split(' ')[0];

  const adh = kpis.rolling_7d_adherence;
  const adhColor =
    adh >= 90
      ? 'var(--affine-success-color)'
      : adh >= 80
        ? 'var(--affine-warning-color)'
        : 'var(--affine-error-color)';

  return (
    <PageShell
      title={`Welcome back, ${firstName} 👋`}
      subtitle={`Week ${kpis.program_week} of 12 · Day ${kpis.program_day} · ${this_week_targets.phase_name}`}
    >
      {/* KPI tiles */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 24,
        }}
      >
        <KpiTile
          label="7-Day Adherence"
          value={adh.toFixed(1)}
          unit="%"
          accent={adhColor}
        />
        <KpiTile
          label="Avg Energy"
          value={kpis.avg_energy_7d?.toFixed(1) ?? '—'}
          unit="/10"
        />
        <KpiTile
          label="Avg Focus"
          value={kpis.avg_focus_7d?.toFixed(1) ?? '—'}
          unit="/10"
        />
        <KpiTile
          label="Avg Sleep"
          value={kpis.avg_sleep_7d?.toFixed(1) ?? '—'}
          unit="h"
        />
        <KpiTile
          label="Current Streak"
          value={kpis.streak_days ?? 0}
          unit=" days"
        />
      </div>

      {/* Two-column: targets + mini calendar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 20,
          marginBottom: 20,
        }}
      >
        {/* This week's targets */}
        <Card>
          <SectionLabel>This Week&apos;s Targets</SectionLabel>
          <TargetRow
            emoji="☀️"
            label="Wake Time"
            value={this_week_targets.wake_time}
          />
          <TargetRow
            emoji="🌙"
            label="Bedtime"
            value={this_week_targets.bedtime}
          />
          <TargetRow
            emoji="☕"
            label="Caffeine Cutoff"
            value={this_week_targets.caffeine_cutoff}
          />
          <TargetRow
            emoji="🌿"
            label="Morning Light"
            value={`${this_week_targets.morning_light_min} min`}
          />
          <TargetRow
            emoji="🏃"
            label="Exercise Window"
            value={this_week_targets.exercise_time}
          />
          <TargetRow
            emoji="🧠"
            label="Peak Focus Window"
            value={this_week_targets.peak_window}
          />
        </Card>

        {/* Upcoming events */}
        <Card>
          <SectionLabel>Upcoming Check-Ins</SectionLabel>
          {upcoming_events.length === 0 ? (
            <EmptyText>No upcoming events.</EmptyText>
          ) : (
            upcoming_events.slice(0, 6).map(ev => (
              <div
                key={ev.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 0',
                  borderBottom: '1px solid var(--affine-border-color)',
                  fontSize: 13,
                }}
              >
                <span style={{ color: 'var(--affine-text-primary-color)' }}>
                  {ev.title}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: 'var(--affine-text-secondary-color)',
                  }}
                >
                  {new Date(ev.scheduled_at).toLocaleString(undefined, {
                    weekday: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            ))
          )}
        </Card>
      </div>

      {/* Adherence bar */}
      <Card style={{ marginBottom: 20 }}>
        <SectionLabel>7-Day Adherence</SectionLabel>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 6,
            fontSize: 13,
          }}
        >
          <span style={{ color: 'var(--affine-text-secondary-color)' }}>
            Progress toward 90% target
          </span>
          <span style={{ fontWeight: 700, color: adhColor }}>
            {adh.toFixed(1)}%
          </span>
        </div>
        <ProgressBar value={adh} max={100} color={adhColor} />
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginTop: 4,
          }}
        >
          <span
            style={{
              fontSize: 10,
              color: 'var(--affine-text-disable-color)',
            }}
          >
            Target: 90%
          </span>
        </div>
      </Card>

      {/* Recent check-ins */}
      <Card>
        <SectionLabel>Recent Check-Ins</SectionLabel>
        {recent_checkins.length === 0 ? (
          <EmptyText>
            No check-ins yet — reply to the morning Discord prompt to submit
            your first one!
          </EmptyText>
        ) : (
          recent_checkins.slice(0, 3).map(ci => (
            <div
              key={ci.id}
              style={{
                padding: '12px 0',
                borderBottom: '1px solid var(--affine-border-color)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 6,
                }}
              >
                <Tag color={ci.type === 'morning' ? 'blue' : 'neutral'}>
                  {ci.type}
                </Tag>
                <span
                  style={{
                    fontSize: 12,
                    color: 'var(--affine-text-secondary-color)',
                  }}
                >
                  Week {ci.program_week} · Day {ci.program_day} ·{' '}
                  {new Date(ci.submitted_at).toLocaleDateString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
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
              {ci.ai_analysis && (
                <p
                  style={{
                    fontSize: 13,
                    lineHeight: 1.6,
                    color: 'var(--affine-text-secondary-color)',
                    margin: 0,
                  }}
                >
                  {ci.ai_analysis.slice(0, 180)}
                  {ci.ai_analysis.length > 180 ? '…' : ''}
                </p>
              )}
            </div>
          ))
        )}
      </Card>
    </PageShell>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
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

function TargetRow({
  emoji,
  label,
  value,
}: {
  emoji: string;
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '7px 0',
        borderBottom: '1px solid var(--affine-border-color)',
        fontSize: 13,
      }}
    >
      <span style={{ color: 'var(--affine-text-secondary-color)' }}>
        {emoji} {label}
      </span>
      <span
        style={{
          fontWeight: 600,
          color: 'var(--affine-text-primary-color)',
          fontFamily: 'var(--affine-font-mono)',
          fontSize: 12,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function EmptyText({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: 13,
        color: 'var(--affine-text-secondary-color)',
        margin: 0,
      }}
    >
      {children}
    </p>
  );
}
