'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { AuthLayout } from '../../../components/layout';
import { cs, font, glassCard, lbl, adherenceColor } from '../../../lib/styles';

interface StatsData {
  summary: {
    total_checkins: number;
    avg_adherence: number;
    avg_energy: number;
    avg_focus: number;
    avg_sleep_hours: number;
    morning_count: number;
    evening_count: number;
  };
  trend7d: Array<{
    day: string;
    avg_adherence: number;
    avg_energy: number;
    avg_sleep: number;
  }>;
}

export default function ProgressPage() {
  const [clientId, setClientId] = useState<string | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ client: { id: string } }>('/api/dashboard/client')
      .then((data) => setClientId(data.client.id))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!clientId) return;
    api<StatsData>(`/api/clients/${clientId}/checkins/stats`)
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [clientId]);

  return (
    <AuthLayout>
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
          <div className="spinner" />
        </div>
      ) : !stats ? (
        <div style={glassCard({ padding: '48px', textAlign: 'center' })}>
          <p style={{ fontSize: '14px', color: cs.textDim, margin: 0 }}>No data yet</p>
        </div>
      ) : (
        <>
          <style>{`
            @media (max-width: 768px) {
              .fs-prog-stats-grid {
                grid-template-columns: repeat(2, 1fr) !important;
                gap: 8px !important;
              }
              .fs-prog-breakdown-grid {
                grid-template-columns: 1fr !important;
              }
              .fs-prog-trend-row {
                flex-wrap: wrap !important;
                gap: 8px !important;
              }
              .fs-prog-trend-date {
                width: 100% !important;
                font-size: 11px !important;
              }
              .fs-prog-trend-values {
                gap: 8px !important;
              }
              .fs-prog-stat-value {
                font-size: 22px !important;
              }
            }
          `}</style>
          {/* Stat cards */}
          <div className="fs-prog-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
            <StatCard label="Total Check-ins" value={stats.summary.total_checkins} gradient />
            <StatCard label="Avg Adherence" value={`${stats.summary.avg_adherence ?? 0}%`} color={cs.warn} />
            <StatCard label="Avg Energy" value={`${stats.summary.avg_energy ?? '-'}/10`} color={cs.violet} />
            <StatCard label="Avg Sleep" value={`${stats.summary.avg_sleep_hours ?? '-'}h`} color={cs.blue} />
          </div>

          {/* Breakdown + Focus row */}
          <div className="fs-prog-breakdown-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', marginBottom: '24px' }}>
            {/* Check-in Breakdown */}
            <div style={glassCard()}>
              <h3 style={{ fontSize: '13px', fontWeight: 600, color: cs.textHeading, margin: '0 0 16px 0', fontFamily: font }}>
                Check-in Breakdown
              </h3>
              <div style={{ display: 'flex', gap: '32px' }}>
                <div>
                  <p style={{ fontSize: '28px', fontWeight: 600, color: cs.warn, margin: 0, fontFamily: font }}>
                    {stats.summary.morning_count}
                  </p>
                  <p style={{ ...lbl, marginTop: '4px', marginBottom: 0 }}>Morning</p>
                </div>
                <div>
                  <p style={{ fontSize: '28px', fontWeight: 600, color: cs.violet, margin: 0, fontFamily: font }}>
                    {stats.summary.evening_count}
                  </p>
                  <p style={{ ...lbl, marginTop: '4px', marginBottom: 0 }}>Evening</p>
                </div>
              </div>
              {/* Visual ratio bar */}
              {(stats.summary.morning_count + stats.summary.evening_count) > 0 && (
                <div style={{ marginTop: '16px', height: '4px', borderRadius: '100px', overflow: 'hidden', display: 'flex' }}>
                  <div style={{
                    width: `${(stats.summary.morning_count / (stats.summary.morning_count + stats.summary.evening_count)) * 100}%`,
                    background: cs.warn,
                    borderRadius: '100px 0 0 100px',
                  }} />
                  <div style={{
                    flex: 1,
                    background: cs.violet,
                    borderRadius: '0 100px 100px 0',
                  }} />
                </div>
              )}
            </div>

            {/* Avg Focus */}
            <div style={glassCard()}>
              <h3 style={{ fontSize: '13px', fontWeight: 600, color: cs.textHeading, margin: '0 0 16px 0', fontFamily: font }}>
                Avg Focus
              </h3>
              <p style={{ fontSize: '28px', fontWeight: 600, color: cs.blue, margin: 0, fontFamily: font }}>
                {stats.summary.avg_focus ?? '-'}/10
              </p>
              <p style={{ ...lbl, marginTop: '4px', marginBottom: 0 }}>Rating</p>
            </div>
          </div>

          {/* 7-Day Trend */}
          <div style={glassCard()}>
            <h3 style={{ fontSize: '13px', fontWeight: 600, color: cs.textHeading, margin: '0 0 20px 0', fontFamily: font }}>
              7-Day Trend
            </h3>
            {stats.trend7d.length === 0 ? (
              <p style={{ fontSize: '14px', textAlign: 'center', padding: '24px 0', color: cs.textMuted, margin: 0 }}>
                No data for the past 7 days
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {stats.trend7d.map((day, i) => {
                  const adh = day.avg_adherence ?? 0;
                  return (
                    <div
                      key={day.day}
                      className="fs-prog-trend-row"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px 0',
                        borderBottom: i < stats.trend7d.length - 1 ? `1px solid ${cs.border}` : 'none',
                      }}
                    >
                      {/* Date label */}
                      <span className="fs-prog-trend-date" style={{ fontSize: '12px', width: '96px', flexShrink: 0, color: cs.textDim, fontFamily: font }}>
                        {new Date(day.day).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </span>

                      {/* Bar */}
                      <div style={{ flex: 1, height: '6px', borderRadius: '100px', overflow: 'hidden', background: cs.surfaceRaised }}>
                        <div style={{
                          height: '100%',
                          borderRadius: '100px',
                          width: `${Math.min(100, adh)}%`,
                          background: cs.gradient,
                          transition: 'width 0.4s ease',
                        }} />
                      </div>

                      {/* Values */}
                      <div className="fs-prog-trend-values" style={{ display: 'flex', gap: '12px', flexShrink: 0, fontSize: '12px', fontFamily: font }}>
                        <span style={{ width: '40px', textAlign: 'right', fontWeight: 500, color: adherenceColor(adh) }}>
                          {adh}%
                        </span>
                        <span style={{ width: '32px', textAlign: 'right', color: cs.textDim }}>
                          E:{day.avg_energy ?? '-'}
                        </span>
                        <span style={{ width: '40px', textAlign: 'right', color: cs.textDim }}>
                          {day.avg_sleep ?? '-'}h
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </AuthLayout>
  );
}

/* -- Sub-components ------------------------------------------------- */

function StatCard({ label, value, color, gradient }: { label: string; value: string | number; color?: string; gradient?: boolean }) {
  return (
    <div style={glassCard({ padding: '20px', textAlign: 'center' })}>
      <p style={{
        fontSize: '28px',
        fontWeight: 600,
        letterSpacing: '-0.02em',
        margin: 0,
        fontFamily: font,
        ...(gradient
          ? { background: cs.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }
          : { color: color ?? cs.textHeading }),
      }}>
        {value}
      </p>
      <p style={{ ...lbl, marginTop: '6px', marginBottom: 0 }}>{label}</p>
    </div>
  );
}
