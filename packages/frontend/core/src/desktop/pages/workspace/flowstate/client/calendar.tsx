/**
 * FlowState — Client Calendar  (Phase 5)
 *
 * Route: /calendar (inside client workspace)
 * Full monthly calendar from calendar_events data.
 * Colour coding: green=completed, red=missed, grey=scheduled,
 * blue=milestone / phase_transition.
 */
import {
  useFlowStateAuth,
  useFlowStateData,
} from '@affine/core/modules/flowstate';
import { useState } from 'react';

import {
  Btn,
  ErrorBanner,
  LoadingSkeleton,
  PageShell,
  Tag,
} from '../shared/page-shell';
import type { CalendarEvent } from '../shared/types';
import { useAsync } from '../shared/use-async';

// ─── Colour helpers ───────────────────────────────────────────────────────────

function eventColor(ev: CalendarEvent): string {
  if (ev.status === 'completed') return 'var(--affine-success-color)';
  if (ev.status === 'missed') return 'var(--affine-error-color)';
  if (ev.type === 'milestone' || ev.type === 'phase_transition')
    return '#3b82f6';
  if (ev.type === 'intervention') return 'var(--affine-warning-color)';
  return 'var(--affine-text-disable-color)';
}

function eventBg(ev: CalendarEvent): string {
  if (ev.status === 'completed')
    return 'var(--affine-background-success-color)';
  if (ev.status === 'missed') return 'var(--affine-background-error-color)';
  if (ev.type === 'milestone' || ev.type === 'phase_transition')
    return 'rgba(59,130,246,0.1)';
  if (ev.type === 'intervention')
    return 'var(--affine-background-warning-color)';
  return 'var(--affine-background-tertiary-color)';
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Component() {
  const { user } = useFlowStateAuth();
  const { fetchCalendar } = useFlowStateData();
  const clientId =
    (user as unknown as { clientId?: string })?.clientId ?? user?.id ?? '';

  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const { data, loading, error } = useAsync<CalendarEvent[]>(
    () => fetchCalendar(clientId) as Promise<CalendarEvent[]>,
    [fetchCalendar, clientId]
  );

  const events = data ?? [];

  // Build a lookup: dateStr → events[]
  const byDay = new Map<string, CalendarEvent[]>();
  for (const ev of events) {
    const d = ev.scheduled_at.split('T')[0];
    if (!byDay.has(d)) byDay.set(d, []);
    byDay.get(d)?.push(ev);
  }

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthName = viewDate.toLocaleString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  // Calendar grid
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<number | null> = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const todayStr = new Date().toISOString().split('T')[0];
  const selectedEvents = selectedDay ? (byDay.get(selectedDay) ?? []) : [];

  return (
    <PageShell
      title="My Calendar"
      subtitle="All check-in events, milestones, and interventions"
      noPadding
    >
      {error && <ErrorBanner message={error} />}

      <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
        {/* Calendar */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {/* Month navigation */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
            }}
          >
            <Btn
              variant="secondary"
              small
              onClick={() => setViewDate(new Date(year, month - 1, 1))}
            >
              ← Prev
            </Btn>
            <span
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: 'var(--affine-text-primary-color)',
              }}
            >
              {monthName}
            </span>
            <Btn
              variant="secondary"
              small
              onClick={() => setViewDate(new Date(year, month + 1, 1))}
            >
              Next →
            </Btn>
          </div>

          {/* Day-of-week headers */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 2,
              marginBottom: 2,
            }}
          >
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div
                key={d}
                style={{
                  textAlign: 'center',
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--affine-text-secondary-color)',
                  padding: '4px 0',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Days */}
          {loading ? (
            <LoadingSkeleton rows={6} />
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: 2,
              }}
            >
              {cells.map((day, idx) => {
                if (day === null) {
                  return <div key={`empty-${idx}`} style={{ minHeight: 72 }} />;
                }
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const dayEvents = byDay.get(dateStr) ?? [];
                const isToday = dateStr === todayStr;
                const isSelected = dateStr === selectedDay;

                return (
                  <div
                    key={dateStr}
                    onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                    style={{
                      minHeight: 72,
                      border: isSelected
                        ? '2px solid var(--affine-primary-color)'
                        : '1px solid var(--affine-border-color)',
                      borderRadius: 8,
                      padding: '6px',
                      cursor: 'pointer',
                      background: isToday
                        ? 'var(--affine-primary-color-08)'
                        : 'var(--affine-background-secondary-color)',
                      transition: 'background 0.1s',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: isToday ? 700 : 400,
                        color: isToday
                          ? 'var(--affine-primary-color)'
                          : 'var(--affine-text-primary-color)',
                        marginBottom: 4,
                      }}
                    >
                      {day}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                      }}
                    >
                      {dayEvents.slice(0, 3).map(ev => (
                        <div
                          key={ev.id}
                          title={ev.title}
                          style={{
                            height: 5,
                            borderRadius: 3,
                            background: eventColor(ev),
                          }}
                        />
                      ))}
                      {dayEvents.length > 3 && (
                        <div
                          style={{
                            fontSize: 9,
                            color: 'var(--affine-text-disable-color)',
                          }}
                        >
                          +{dayEvents.length - 3}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Legend */}
          <div
            style={{
              display: 'flex',
              gap: 16,
              marginTop: 16,
              flexWrap: 'wrap',
            }}
          >
            {[
              { label: 'Completed', color: 'var(--affine-success-color)' },
              { label: 'Missed', color: 'var(--affine-error-color)' },
              { label: 'Milestone / Phase', color: '#3b82f6' },
              { label: 'Scheduled', color: 'var(--affine-text-disable-color)' },
            ].map(({ label, color }) => (
              <div
                key={label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 11,
                  color: 'var(--affine-text-secondary-color)',
                }}
              >
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: color,
                  }}
                />
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Day detail panel */}
        {selectedDay && (
          <div
            style={{
              width: 280,
              borderLeft: '1px solid var(--affine-border-color)',
              overflowY: 'auto',
              padding: '20px 16px',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: 'var(--affine-text-primary-color)',
                marginBottom: 12,
              }}
            >
              {new Date(selectedDay + 'T12:00:00').toLocaleDateString(
                undefined,
                {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                }
              )}
            </div>
            {selectedEvents.length === 0 ? (
              <p
                style={{
                  fontSize: 13,
                  color: 'var(--affine-text-secondary-color)',
                }}
              >
                No events on this day.
              </p>
            ) : (
              selectedEvents.map(ev => (
                <div
                  key={ev.id}
                  style={{
                    background: eventBg(ev),
                    border: `1px solid ${eventColor(ev)}`,
                    borderRadius: 8,
                    padding: '10px 12px',
                    marginBottom: 10,
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--affine-text-primary-color)',
                      marginBottom: 4,
                    }}
                  >
                    {ev.title}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <Tag
                      color={
                        ev.status === 'completed'
                          ? 'green'
                          : ev.status === 'missed'
                            ? 'red'
                            : ev.type === 'milestone'
                              ? 'blue'
                              : 'neutral'
                      }
                    >
                      {ev.status}
                    </Tag>
                  </div>
                  {ev.notes && (
                    <p
                      style={{
                        fontSize: 12,
                        color: 'var(--affine-text-secondary-color)',
                        marginTop: 6,
                        marginBottom: 0,
                        lineHeight: 1.5,
                      }}
                    >
                      {ev.notes}
                    </p>
                  )}
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--affine-text-disable-color)',
                      marginTop: 6,
                    }}
                  >
                    {new Date(ev.scheduled_at).toLocaleTimeString(undefined, {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </PageShell>
  );
}
