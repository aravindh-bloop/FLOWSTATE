'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { AuthLayout } from '../../../components/layout';
import { cs, font, glassCard, lbl, adherenceColor } from '../../../lib/styles';

interface CheckIn {
  id: string;
  type: string;
  submitted_at: string;
  adherence_score: number | null;
  energy_rating: number | null;
  focus_rating: number | null;
  sleep_hours: number | null;
  ai_analysis: string | null;
  photo_url: string | null;
  client_note: string | null;
}

export default function TrackersPage() {
  const [clientId, setClientId] = useState<string | null>(null);
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState<'all' | 'morning' | 'evening'>('all');

  useEffect(() => {
    api<{ client: { id: string } }>('/api/dashboard/client')
      .then((data) => setClientId(data.client.id))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!clientId) return;
    setLoading(true);
    api<{ data: CheckIn[]; pagination: { pages: number } }>(`/api/clients/${clientId}/checkins?page=${page}&limit=20`)
      .then((res) => {
        setCheckins(res.data);
        setTotalPages(res.pagination.pages);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [clientId, page]);

  const filtered = filter === 'all' ? checkins : checkins.filter((c) => c.type === filter);

  return (
    <AuthLayout>
      <style>{`
        @media (max-width: 768px) {
          .fs-track-card {
            padding: 14px 14px !important;
          }
          .fs-track-card-header {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 6px !important;
          }
          .fs-track-metrics {
            gap: 10px !important;
          }
          .fs-track-pagination {
            gap: 8px !important;
          }
          .fs-track-pagination button {
            padding: 6px 14px !important;
            font-size: 11px !important;
          }
        }
      `}</style>
      {/* Filter pills */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '4px' }}>
        {(['all', 'morning', 'evening'] as const).map((f) => {
          const active = filter === f;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '6px 18px',
                borderRadius: '100px',
                fontSize: '12px',
                fontWeight: 500,
                fontFamily: font,
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                transition: 'all 0.2s',
                border: active ? `1px solid ${cs.violetBorder}` : `1px solid ${cs.border}`,
                background: active ? cs.violetBg : cs.surface,
                color: active ? cs.violet : cs.textMuted,
              }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
          <div className="spinner" />
        </div>
      ) : (
        <>
          {/* Check-in rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filtered.map((ci) => (
              <div
                key={ci.id}
                className="fs-track-card"
                style={{
                  ...glassCard({ padding: '16px 20px' }),
                  transition: 'background 0.15s, border-color 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = cs.surfaceHover;
                  e.currentTarget.style.borderColor = cs.border;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = cs.surface;
                  e.currentTarget.style.borderColor = cs.border;
                }}
              >
                {/* Top row: date + type pill */}
                <div className="fs-track-card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 500, color: cs.text, fontFamily: font }}>
                    {new Date(ci.submitted_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  <TypePill type={ci.type} />
                </div>

                {/* Metrics row */}
                <div className="fs-track-metrics" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '12px', fontFamily: font }}>
                  {ci.adherence_score != null && (
                    <MetricBadge label="Adherence" value={`${ci.adherence_score}%`} color={adherenceColor(ci.adherence_score)} />
                  )}
                  {ci.energy_rating != null && (
                    <MetricBadge label="Energy" value={`${ci.energy_rating}/10`} color={cs.warn} />
                  )}
                  {ci.focus_rating != null && (
                    <MetricBadge label="Focus" value={`${ci.focus_rating}/10`} color={cs.blue} />
                  )}
                  {ci.sleep_hours != null && (
                    <MetricBadge label="Sleep" value={`${ci.sleep_hours}h`} color={cs.violet} />
                  )}
                </div>

                {/* AI summary */}
                {ci.ai_analysis && (
                  <p style={{
                    fontSize: '12px',
                    color: cs.textMuted,
                    margin: '10px 0 0 0',
                    fontFamily: font,
                    lineHeight: '1.5',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>
                    {ci.ai_analysis}
                  </p>
                )}
              </div>
            ))}

            {filtered.length === 0 && (
              <div style={glassCard({ padding: '48px', textAlign: 'center' })}>
                <p style={{ fontSize: '14px', color: cs.textMuted, margin: 0 }}>No check-ins found</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="fs-track-pagination" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginTop: '20px' }}>
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                style={{
                  padding: '8px 18px',
                  borderRadius: '100px',
                  fontSize: '12px',
                  fontFamily: font,
                  cursor: page === 1 ? 'default' : 'pointer',
                  background: 'transparent',
                  border: `1px solid ${cs.border}`,
                  color: page === 1 ? cs.textMuted : cs.text,
                  opacity: page === 1 ? 0.4 : 1,
                  transition: 'all 0.2s',
                }}
              >
                Previous
              </button>
              <span style={{ fontSize: '12px', color: cs.textDim, fontFamily: font }}>
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                style={{
                  padding: '8px 18px',
                  borderRadius: '100px',
                  fontSize: '12px',
                  fontFamily: font,
                  cursor: page >= totalPages ? 'default' : 'pointer',
                  background: 'transparent',
                  border: `1px solid ${cs.border}`,
                  color: page >= totalPages ? cs.textMuted : cs.text,
                  opacity: page >= totalPages ? 0.4 : 1,
                  transition: 'all 0.2s',
                }}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </AuthLayout>
  );
}

/* -- Sub-components ------------------------------------------------- */

function MetricBadge({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <span style={{ ...lbl, marginBottom: 0, fontSize: '9px' }}>{label}</span>
      <span style={{ fontSize: '13px', fontWeight: 500, color, fontFamily: font }}>{value}</span>
    </div>
  );
}

function TypePill({ type }: { type: string }) {
  const isMorning = type === 'morning';
  const clr = isMorning ? cs.warn : cs.violet;
  return (
    <span style={{
      fontSize: '10px',
      fontWeight: 500,
      padding: '2px 10px',
      borderRadius: '100px',
      background: isMorning ? cs.warnBg : cs.violetBg,
      border: `1px solid ${isMorning ? cs.warnBorder : cs.violetBorder}`,
      color: clr,
      fontFamily: font,
      textTransform: 'capitalize' as const,
    }}>
      {type}
    </span>
  );
}
