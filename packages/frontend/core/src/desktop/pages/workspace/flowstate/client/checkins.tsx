/**
 * FlowState — Check-In History  (Phase 5)
 *
 * Route: /checkins (inside client workspace)
 * Paginated log of all Discord check-ins with AI feedback and photo.
 */
import {
  useFlowStateAuth,
  useFlowStateData,
} from '@affine/core/modules/flowstate';
import { useState } from 'react';

import {
  Btn,
  Card,
  ErrorBanner,
  LoadingSkeleton,
  PageShell,
  Tag,
} from '../shared/page-shell';
import type { CheckIn } from '../shared/types';
import { useAsync } from '../shared/use-async';

// ─── Component ────────────────────────────────────────────────────────────────

export function Component() {
  const { user } = useFlowStateAuth();
  const { fetchCheckIns } = useFlowStateData();
  const clientId =
    (user as unknown as { clientId?: string })?.clientId ?? user?.id ?? '';

  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const { data, loading, error } = useAsync<CheckIn[]>(
    () => fetchCheckIns(clientId, page) as Promise<CheckIn[]>,
    [fetchCheckIns, clientId, page]
  );

  const checkIns = data ?? [];
  const filtered =
    typeFilter === 'all'
      ? checkIns
      : checkIns.filter(c => c.type === typeFilter);

  return (
    <PageShell
      title="Check-In History"
      subtitle="Full log from Discord — all morning, evening, and wearable submissions"
    >
      {error && <ErrorBanner message={error} />}

      {/* Filters */}
      <div
        style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}
      >
        {(['all', 'morning', 'evening', 'wearable'] as const).map(t => (
          <button
            key={t}
            onClick={() => {
              setTypeFilter(t);
              setPage(1);
            }}
            style={{
              padding: '5px 14px',
              borderRadius: 6,
              fontSize: 12,
              border: '1px solid var(--affine-border-color)',
              cursor: 'pointer',
              background:
                typeFilter === t
                  ? 'var(--affine-primary-color)'
                  : 'var(--affine-background-secondary-color)',
              color:
                typeFilter === t
                  ? '#fff'
                  : 'var(--affine-text-secondary-color)',
              fontWeight: typeFilter === t ? 600 : 400,
            }}
          >
            {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSkeleton rows={5} />
      ) : filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {filtered.map(ci => (
            <CheckInCard key={ci.id} checkIn={ci} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && (
        <div
          style={{
            display: 'flex',
            gap: 8,
            justifyContent: 'center',
            marginTop: 24,
          }}
        >
          <Btn
            variant="secondary"
            small
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            ← Prev
          </Btn>
          <span
            style={{
              padding: '5px 12px',
              fontSize: 12,
              color: 'var(--affine-text-secondary-color)',
            }}
          >
            Page {page}
          </span>
          <Btn
            variant="secondary"
            small
            onClick={() => setPage(p => p + 1)}
            disabled={checkIns.length < 20}
          >
            Next →
          </Btn>
        </div>
      )}
    </PageShell>
  );
}

// ─── Check-in card ────────────────────────────────────────────────────────────

function CheckInCard({ checkIn: ci }: { checkIn: CheckIn }) {
  const [showFull, setShowFull] = useState(false);

  const submitDate = new Date(ci.submitted_at);

  return (
    <Card>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 12,
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Tag
            color={
              ci.type === 'morning'
                ? 'blue'
                : ci.type === 'evening'
                  ? 'neutral'
                  : 'green'
            }
          >
            {ci.type === 'morning'
              ? '☀️ Morning'
              : ci.type === 'evening'
                ? '🌙 Evening'
                : '📊 Wearable'}
          </Tag>
          <span
            style={{
              fontSize: 12,
              color: 'var(--affine-text-secondary-color)',
            }}
          >
            Week {ci.program_week} · Day {ci.program_day}
          </span>
          <span
            style={{ fontSize: 12, color: 'var(--affine-text-disable-color)' }}
          >
            {submitDate.toLocaleDateString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}{' '}
            {submitDate.toLocaleTimeString(undefined, {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
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
              {ci.adherence_score}% Adherence
            </Tag>
          )}
          {ci.energy_rating != null && (
            <Tag color="neutral">⚡ {ci.energy_rating}/10</Tag>
          )}
          {ci.focus_rating != null && (
            <Tag color="neutral">🧠 {ci.focus_rating}/10</Tag>
          )}
          {ci.sleep_hours != null && (
            <Tag color="neutral">💤 {ci.sleep_hours}h</Tag>
          )}
        </div>
      </div>

      {/* Protocol compliance */}
      {(ci.exercise_completed != null ||
        ci.morning_light_completed != null ||
        ci.caffeine_cutoff_met != null) && (
        <div
          style={{
            display: 'flex',
            gap: 8,
            marginBottom: 12,
            flexWrap: 'wrap',
          }}
        >
          {ci.exercise_completed != null && (
            <ProtocolBadge label="Exercise" met={ci.exercise_completed} />
          )}
          {ci.morning_light_completed != null && (
            <ProtocolBadge
              label="Morning Light"
              met={ci.morning_light_completed}
            />
          )}
          {ci.caffeine_cutoff_met != null && (
            <ProtocolBadge
              label="Caffeine Cutoff"
              met={ci.caffeine_cutoff_met}
            />
          )}
          {ci.wake_time_actual && (
            <span
              style={{
                fontSize: 11,
                color: 'var(--affine-text-secondary-color)',
                padding: '2px 8px',
                background: 'var(--affine-background-tertiary-color)',
                borderRadius: 4,
              }}
            >
              Wake: {ci.wake_time_actual}
            </span>
          )}
        </div>
      )}

      {/* Photo thumbnail */}
      {ci.photo_url && (
        <div style={{ marginBottom: 12 }}>
          <img
            src={ci.photo_url}
            alt="Check-in photo"
            style={{
              maxWidth: 200,
              maxHeight: 150,
              borderRadius: 8,
              objectFit: 'cover',
              border: '1px solid var(--affine-border-color)',
            }}
          />
        </div>
      )}

      {/* Client note */}
      {ci.client_note && (
        <div
          style={{
            background: 'var(--affine-background-primary-color)',
            borderLeft: '3px solid var(--affine-primary-color)',
            padding: '8px 12px',
            borderRadius: '0 6px 6px 0',
            fontSize: 13,
            lineHeight: 1.6,
            color: 'var(--affine-text-primary-color)',
            marginBottom: 10,
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--affine-primary-color)',
              display: 'block',
              marginBottom: 2,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Your note
          </span>
          {ci.client_note}
        </div>
      )}

      {/* AI analysis */}
      {ci.ai_analysis && (
        <div>
          <div
            style={{
              background: 'var(--affine-primary-color-08)',
              border: '1px solid var(--affine-primary-color-10)',
              borderRadius: 8,
              padding: '10px 14px',
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: 'var(--affine-primary-color)',
                display: 'block',
                marginBottom: 4,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              AI Feedback
              {ci.ai_model_used && (
                <span
                  style={{
                    fontWeight: 400,
                    color: 'var(--affine-text-disable-color)',
                    marginLeft: 6,
                  }}
                >
                  via {ci.ai_model_used}
                </span>
              )}
            </span>
            <p
              style={{
                fontSize: 13,
                lineHeight: 1.65,
                color: 'var(--affine-text-primary-color)',
                margin: 0,
              }}
            >
              {showFull
                ? ci.ai_analysis
                : ci.ai_analysis.slice(0, 220) +
                  (ci.ai_analysis.length > 220 ? '…' : '')}
            </p>
            {ci.ai_analysis.length > 220 && (
              <button
                onClick={() => setShowFull(s => !s)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--affine-primary-color)',
                  fontSize: 12,
                  padding: '4px 0 0',
                }}
              >
                {showFull ? 'Show less' : 'Read more'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Wearable data */}
      {(ci.wearable_hrv != null ||
        ci.wearable_recovery_score != null ||
        ci.wearable_sleep_score != null) && (
        <div
          style={{
            display: 'flex',
            gap: 12,
            marginTop: 10,
            flexWrap: 'wrap',
          }}
        >
          {ci.wearable_hrv != null && (
            <StatBadge label="HRV" value={`${ci.wearable_hrv} ms`} />
          )}
          {ci.wearable_recovery_score != null && (
            <StatBadge
              label="Recovery"
              value={`${ci.wearable_recovery_score}%`}
            />
          )}
          {ci.wearable_sleep_score != null && (
            <StatBadge
              label="Sleep Score"
              value={`${ci.wearable_sleep_score}`}
            />
          )}
        </div>
      )}
    </Card>
  );
}

function ProtocolBadge({ label, met }: { label: string; met: boolean }) {
  return (
    <span
      style={{
        fontSize: 11,
        padding: '2px 8px',
        borderRadius: 4,
        background: met
          ? 'var(--affine-background-success-color)'
          : 'var(--affine-background-error-color)',
        color: met
          ? 'var(--affine-success-color)'
          : 'var(--affine-error-color)',
        fontWeight: 600,
      }}
    >
      {met ? '✓' : '✗'} {label}
    </span>
  );
}

function StatBadge({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        background: 'var(--affine-background-tertiary-color)',
        border: '1px solid var(--affine-border-color)',
        borderRadius: 6,
        padding: '4px 10px',
        fontSize: 11,
      }}
    >
      <span style={{ color: 'var(--affine-text-secondary-color)' }}>
        {label}:{' '}
      </span>
      <span
        style={{ fontWeight: 600, color: 'var(--affine-text-primary-color)' }}
      >
        {value}
      </span>
    </div>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '64px 24px',
        color: 'var(--affine-text-secondary-color)',
      }}
    >
      <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
        No check-ins yet
      </div>
      <div style={{ fontSize: 13 }}>
        Reply to the morning Discord prompt to submit your first check-in.
      </div>
    </div>
  );
}
