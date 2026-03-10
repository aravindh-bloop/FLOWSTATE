/**
 * FlowState — Client Progress  (Phase 5)
 *
 * Route: /progress (inside client workspace)
 * Line charts for adherence, energy, focus, and sleep trends
 * plus milestone comparison table — using lightweight inline SVG charts.
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
import type { CheckInStats } from '../shared/types';
import { useAsync } from '../shared/use-async';

// ─── Component ────────────────────────────────────────────────────────────────

export function Component() {
  const { user } = useFlowStateAuth();
  const { fetchCheckInStats } = useFlowStateData();
  const clientId =
    (user as unknown as { clientId?: string })?.clientId ?? user?.id ?? '';

  const {
    data: stats,
    loading,
    error,
  } = useAsync<CheckInStats>(
    () => fetchCheckInStats(clientId) as Promise<CheckInStats>,
    [fetchCheckInStats, clientId]
  );

  if (loading) {
    return (
      <PageShell title="Progress">
        <LoadingSkeleton rows={8} />
      </PageShell>
    );
  }

  if (error || !stats) {
    return (
      <PageShell title="Progress">
        <ErrorBanner message={error ?? 'Could not load progress data.'} />
      </PageShell>
    );
  }

  const { by_week } = stats;
  const adhValues = by_week.map(w => w.adherence);
  const energyValues = by_week.map(w => w.energy);
  const focusValues = by_week.map(w => w.focus);
  const sleepValues = by_week.map(w => w.sleep);

  return (
    <PageShell
      title="Progress"
      subtitle={`${stats.total - stats.missed} check-ins completed · ${stats.missed} missed`}
    >
      {/* Summary KPIs */}
      <div
        style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}
      >
        <KpiTile
          label="Overall Adherence"
          value={stats.avg_adherence?.toFixed(1) ?? '—'}
          unit="%"
          accent={
            stats.avg_adherence >= 90
              ? 'var(--affine-success-color)'
              : stats.avg_adherence >= 80
                ? 'var(--affine-warning-color)'
                : 'var(--affine-error-color)'
          }
        />
        <KpiTile
          label="Avg Energy"
          value={stats.avg_energy?.toFixed(1) ?? '—'}
          unit="/10"
        />
        <KpiTile
          label="Avg Focus"
          value={stats.avg_focus?.toFixed(1) ?? '—'}
          unit="/10"
        />
        <KpiTile
          label="Avg Sleep"
          value={stats.avg_sleep_hours?.toFixed(1) ?? '—'}
          unit="h"
        />
      </div>

      {/* Charts: 2×2 grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <MetricChart
          title="Adherence"
          unit="%"
          values={adhValues}
          weeks={by_week.map(w => w.week)}
          color="var(--affine-primary-color)"
          target={90}
        />
        <MetricChart
          title="Energy"
          unit="/10"
          values={energyValues}
          weeks={by_week.map(w => w.week)}
          color="#f59e0b"
          target={7}
        />
        <MetricChart
          title="Focus"
          unit="/10"
          values={focusValues}
          weeks={by_week.map(w => w.week)}
          color="#8b5cf6"
          target={7}
        />
        <MetricChart
          title="Sleep"
          unit="h"
          values={sleepValues}
          weeks={by_week.map(w => w.week)}
          color="#3b82f6"
          target={7.5}
        />
      </div>

      {/* Week-by-week table */}
      {by_week.length > 0 && (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div
            style={{
              padding: '14px 20px',
              borderBottom: '1px solid var(--affine-border-color)',
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--affine-text-secondary-color)',
              }}
            >
              Week-by-Week Breakdown
            </span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr
                style={{
                  background: 'var(--affine-background-tertiary-color)',
                }}
              >
                {['Week', 'Adherence', 'Energy', 'Focus', 'Sleep', 'Trend'].map(
                  h => (
                    <th
                      key={h}
                      style={{
                        padding: '8px 16px',
                        textAlign: 'left',
                        fontSize: 11,
                        fontWeight: 600,
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                        color: 'var(--affine-text-secondary-color)',
                        borderBottom: '1px solid var(--affine-border-color)',
                      }}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {by_week.map((w, idx) => {
                const adhColor =
                  w.adherence >= 90
                    ? 'var(--affine-success-color)'
                    : w.adherence >= 80
                      ? 'var(--affine-warning-color)'
                      : 'var(--affine-error-color)';
                const prev = by_week[idx - 1];
                const trend =
                  prev == null
                    ? '—'
                    : w.adherence > prev.adherence
                      ? '↑'
                      : w.adherence < prev.adherence
                        ? '↓'
                        : '→';
                const trendColor =
                  trend === '↑'
                    ? 'var(--affine-success-color)'
                    : trend === '↓'
                      ? 'var(--affine-error-color)'
                      : 'var(--affine-text-secondary-color)';

                return (
                  <tr
                    key={w.week}
                    style={{
                      background:
                        idx % 2 === 0
                          ? undefined
                          : 'var(--affine-background-primary-color)',
                    }}
                  >
                    <td style={tdStyle}>Week {w.week}</td>
                    <td style={tdStyle}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <div style={{ width: 60 }}>
                          <ProgressBar
                            value={w.adherence}
                            max={100}
                            color={adhColor}
                          />
                        </div>
                        <span
                          style={{
                            fontSize: 12,
                            color: adhColor,
                            fontWeight: 600,
                          }}
                        >
                          {w.adherence.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <Tag
                        color={
                          w.energy >= 8
                            ? 'green'
                            : w.energy >= 6
                              ? 'amber'
                              : 'red'
                        }
                      >
                        {w.energy?.toFixed(1) ?? '—'}
                      </Tag>
                    </td>
                    <td style={tdStyle}>
                      <Tag
                        color={
                          w.focus >= 8
                            ? 'green'
                            : w.focus >= 6
                              ? 'amber'
                              : 'red'
                        }
                      >
                        {w.focus?.toFixed(1) ?? '—'}
                      </Tag>
                    </td>
                    <td style={tdStyle}>{w.sleep?.toFixed(1) ?? '—'}h</td>
                    <td
                      style={{
                        ...tdStyle,
                        color: trendColor,
                        fontWeight: 700,
                        fontSize: 16,
                      }}
                    >
                      {trend}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </PageShell>
  );
}

// ─── Metric chart card ────────────────────────────────────────────────────────

function MetricChart({
  title,
  unit,
  values,
  color,
  target,
}: {
  title: string;
  unit: string;
  values: number[];
  weeks: number[];
  color: string;
  target: number;
}) {
  if (values.length === 0) {
    return (
      <Card>
        <ChartTitle>{title}</ChartTitle>
        <p
          style={{ fontSize: 13, color: 'var(--affine-text-secondary-color)' }}
        >
          Not enough data yet.
        </p>
      </Card>
    );
  }

  const latest = values[values.length - 1];
  const latestLabel = `${typeof latest === 'number' ? latest.toFixed(1) : '—'}${unit}`;

  return (
    <Card>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 8,
        }}
      >
        <ChartTitle>{title}</ChartTitle>
        <span style={{ fontSize: 18, fontWeight: 700, color }}>
          {latestLabel}
        </span>
      </div>

      {/* SVG line chart */}
      <SvgLineChart values={values} color={color} target={target} />

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 6,
          fontSize: 10,
          color: 'var(--affine-text-disable-color)',
        }}
      >
        <span>Wk {weeks[0]}</span>
        <span>
          Target: {target}
          {unit}
        </span>
        <span>Wk {weeks[weeks.length - 1]}</span>
      </div>
    </Card>
  );
}

function SvgLineChart({
  values,
  color,
  target,
}: {
  values: number[];
  color: string;
  target: number;
}) {
  const W = 260;
  const H = 80;
  const pad = 4;

  const allVals = [...values, target];
  const minV = Math.min(...allVals) * 0.9;
  const maxV = Math.max(...allVals) * 1.05;
  const range = maxV - minV || 1;

  const toX = (i: number) =>
    pad + (i / Math.max(values.length - 1, 1)) * (W - pad * 2);
  const toY = (v: number) => H - pad - ((v - minV) / range) * (H - pad * 2);

  const pts = values.map((v, i) => `${toX(i)},${toY(v)}`).join(' ');
  const targetY = toY(target);

  // filled area under the line
  const areaPath = [
    `M ${toX(0)},${H}`,
    ...values.map((v, i) => `L ${toX(i)},${toY(v)}`),
    `L ${toX(values.length - 1)},${H}`,
    'Z',
  ].join(' ');

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ display: 'block', overflow: 'visible' }}
    >
      {/* Target line */}
      <line
        x1={pad}
        y1={targetY}
        x2={W - pad}
        y2={targetY}
        stroke={color}
        strokeWidth={0.8}
        strokeDasharray="3 3"
        opacity={0.4}
      />
      {/* Area fill */}
      <path d={areaPath} fill={color} opacity={0.08} />
      {/* Line */}
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Dots */}
      {values.map((v, i) => (
        <circle key={i} cx={toX(i)} cy={toY(v)} r={3} fill={color} />
      ))}
    </svg>
  );
}

function ChartTitle({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: 12,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: 'var(--affine-text-secondary-color)',
      }}
    >
      {children}
    </span>
  );
}

const tdStyle: React.CSSProperties = {
  padding: '10px 16px',
  fontSize: 13,
  color: 'var(--affine-text-primary-color)',
  borderBottom: '1px solid var(--affine-border-color)',
  verticalAlign: 'middle',
};
