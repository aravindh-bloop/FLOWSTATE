/**
 * FlowState — Weekly Reports  (Phase 4)
 *
 * Route: /reports (inside coach workspace)
 * Shows auto-generated Claude Sonnet summaries per client, per week.
 * Coach can add/edit their own notes on each summary.
 */
import { useFlowStateData } from '@affine/core/modules/flowstate';
import { useCallback, useState } from 'react';

import {
  Btn,
  Card,
  ErrorBanner,
  KpiTile,
  LoadingSkeleton,
  PageShell,
  Tag,
} from '../shared/page-shell';
import type { Client, WeeklySummary } from '../shared/types';
import { useAsync } from '../shared/use-async';

// ─── Component ────────────────────────────────────────────────────────────────

export function Component() {
  const { fetchClients, fetchSummaries, addSummaryNotes } = useFlowStateData();

  // Load client list so user can select a client
  const {
    data: clients,
    loading: loadingClients,
    error: errorClients,
  } = useAsync<Client[]>(
    () => fetchClients() as Promise<Client[]>,
    [fetchClients]
  );

  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesText, setNotesText] = useState('');
  const [busy, setBusy] = useState(false);

  const selectedClient = clients?.find(c => c.id === selectedClientId) ?? null;

  const {
    data: summaries,
    loading: loadingSummaries,
    error: errorSummaries,
    reload,
  } = useAsync<WeeklySummary[]>(
    () =>
      selectedClientId
        ? (fetchSummaries(selectedClientId) as Promise<WeeklySummary[]>)
        : Promise.resolve([]),
    [fetchSummaries, selectedClientId]
  );

  const currentSummary =
    summaries?.find(s => s.week_number === selectedWeek) ??
    (summaries?.length ? summaries[summaries.length - 1] : null);

  const startEditNotes = useCallback((s: WeeklySummary) => {
    setEditingNotes(s.id);
    setNotesText(s.coach_notes ?? '');
  }, []);

  const saveNotes = useCallback(
    async (summaryId: string) => {
      setBusy(true);
      try {
        await addSummaryNotes(summaryId, notesText);
        setEditingNotes(null);
        reload();
      } finally {
        setBusy(false);
      }
    },
    [addSummaryNotes, notesText, reload]
  );

  return (
    <PageShell
      title="Weekly Reports"
      subtitle="AI-generated summaries · Coach annotations"
    >
      {(errorClients || errorSummaries) && (
        <ErrorBanner message={errorClients ?? errorSummaries ?? ''} />
      )}

      {/* Client selector */}
      <Card style={{ marginBottom: 24 }}>
        <div
          style={{
            display: 'flex',
            gap: 16,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <label style={labelStyle}>Select Client</label>
            <select
              value={selectedClientId ?? ''}
              onChange={e => {
                setSelectedClientId(e.target.value || null);
                setSelectedWeek(null);
                setEditingNotes(null);
              }}
              style={selectStyle}
            >
              <option value="">— choose a client —</option>
              {(clients ?? []).map(c => (
                <option key={c.id} value={c.id}>
                  {c.full_name} (Week {c.program_week})
                </option>
              ))}
            </select>
          </div>

          {summaries && summaries.length > 0 && (
            <div>
              <label style={labelStyle}>Week</label>
              <select
                value={selectedWeek ?? ''}
                onChange={e =>
                  setSelectedWeek(
                    e.target.value ? Number(e.target.value) : null
                  )
                }
                style={selectStyle}
              >
                <option value="">Latest</option>
                {summaries.map(s => (
                  <option key={s.id} value={s.week_number}>
                    Week {s.week_number}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </Card>

      {loadingClients || (selectedClientId && loadingSummaries) ? (
        <LoadingSkeleton rows={6} />
      ) : !selectedClientId ? (
        <EmptyPrompt message="Select a client above to view their weekly reports." />
      ) : !currentSummary ? (
        <EmptyPrompt message="No summaries have been generated yet for this client." />
      ) : (
        <SummaryView
          summary={currentSummary}
          client={selectedClient}
          isEditing={editingNotes === currentSummary.id}
          notesText={notesText}
          busy={busy}
          onEditNotes={() => startEditNotes(currentSummary)}
          onNotesChange={setNotesText}
          onSaveNotes={() => void saveNotes(currentSummary.id)}
          onCancelNotes={() => setEditingNotes(null)}
          allSummaries={summaries ?? []}
          selectedWeek={selectedWeek ?? summaries?.at(-1)?.week_number ?? 1}
          onSelectWeek={setSelectedWeek}
        />
      )}
    </PageShell>
  );
}

// ─── Summary view ─────────────────────────────────────────────────────────────

function SummaryView({
  summary,
  _client,
  isEditing,
  notesText,
  busy,
  onEditNotes,
  onNotesChange,
  onSaveNotes,
  onCancelNotes,
  allSummaries,
  selectedWeek,
  onSelectWeek,
}: {
  summary: WeeklySummary;
  client: Client | null;
  isEditing: boolean;
  notesText: string;
  busy: boolean;
  onEditNotes: () => void;
  onNotesChange: (t: string) => void;
  onSaveNotes: () => void;
  onCancelNotes: () => void;
  allSummaries: WeeklySummary[];
  selectedWeek: number;
  onSelectWeek: (w: number) => void;
}) {
  return (
    <div>
      {/* Week navigation pills */}
      {allSummaries.length > 1 && (
        <div
          style={{
            display: 'flex',
            gap: 6,
            marginBottom: 20,
            flexWrap: 'wrap',
          }}
        >
          {allSummaries.map(s => (
            <button
              key={s.id}
              onClick={() => onSelectWeek(s.week_number)}
              style={{
                padding: '4px 12px',
                borderRadius: 6,
                fontSize: 12,
                border: '1px solid var(--affine-border-color)',
                cursor: 'pointer',
                background:
                  selectedWeek === s.week_number
                    ? 'var(--affine-primary-color)'
                    : 'var(--affine-background-secondary-color)',
                color:
                  selectedWeek === s.week_number
                    ? '#fff'
                    : 'var(--affine-text-secondary-color)',
                fontWeight: selectedWeek === s.week_number ? 600 : 400,
              }}
            >
              Wk {s.week_number}
            </button>
          ))}
        </div>
      )}

      {/* Stats strip */}
      <div
        style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}
      >
        <KpiTile
          label="Check-Ins"
          value={`${summary.total_checkins - summary.missed_checkins}/${summary.total_checkins}`}
        />
        <KpiTile
          label="Avg Adherence"
          value={summary.avg_adherence?.toFixed(1) ?? '—'}
          unit="%"
        />
        <KpiTile
          label="Avg Energy"
          value={summary.avg_energy?.toFixed(1) ?? '—'}
          unit="/10"
        />
        <KpiTile
          label="Avg Focus"
          value={summary.avg_focus?.toFixed(1) ?? '—'}
          unit="/10"
        />
        <KpiTile
          label="Avg Sleep"
          value={summary.avg_sleep_hours?.toFixed(1) ?? '—'}
          unit="h"
        />
        <KpiTile label="Interventions" value={summary.interventions_sent} />
      </div>

      {/* AI narrative */}
      <Card style={{ marginBottom: 20 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 12,
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
            AI Summary
          </span>
          <Tag color="neutral">Claude Sonnet</Tag>
          <span
            style={{ fontSize: 11, color: 'var(--affine-text-disable-color)' }}
          >
            Generated{' '}
            {new Date(summary.generated_at).toLocaleDateString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
          </span>
        </div>
        <p
          style={{
            fontSize: 14,
            lineHeight: 1.75,
            color: 'var(--affine-text-primary-color)',
            margin: 0,
            whiteSpace: 'pre-wrap',
          }}
        >
          {summary.ai_narrative}
        </p>
      </Card>

      {/* Coach notes */}
      <Card>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
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
            Coach Notes
          </span>
          {!isEditing && (
            <Btn variant="secondary" small onClick={onEditNotes}>
              {summary.coach_notes ? '✎ Edit' : '+ Add Notes'}
            </Btn>
          )}
        </div>

        {isEditing ? (
          <>
            <textarea
              value={notesText}
              onChange={e => onNotesChange(e.target.value)}
              rows={6}
              placeholder="Add your observations, action items, or next-week focus…"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid var(--affine-primary-color)',
                background: 'var(--affine-background-primary-color)',
                color: 'var(--affine-text-primary-color)',
                fontSize: 13,
                lineHeight: 1.6,
                resize: 'vertical',
                outline: 'none',
                boxSizing: 'border-box',
                marginBottom: 12,
              }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn onClick={onSaveNotes} disabled={busy} small>
                Save Notes
              </Btn>
              <Btn variant="secondary" onClick={onCancelNotes} small>
                Cancel
              </Btn>
            </div>
          </>
        ) : (
          <p
            style={{
              fontSize: 14,
              lineHeight: 1.7,
              color: summary.coach_notes
                ? 'var(--affine-text-primary-color)'
                : 'var(--affine-text-disable-color)',
              margin: 0,
              whiteSpace: 'pre-wrap',
            }}
          >
            {summary.coach_notes ?? 'No coach notes yet.'}
          </p>
        )}
      </Card>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function EmptyPrompt({ message }: { message: string }) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '64px 24px',
        color: 'var(--affine-text-secondary-color)',
        fontSize: 14,
      }}
    >
      {message}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  color: 'var(--affine-text-secondary-color)',
  marginBottom: 4,
};

const selectStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid var(--affine-border-color)',
  background: 'var(--affine-background-secondary-color)',
  color: 'var(--affine-text-primary-color)',
  fontSize: 13,
  outline: 'none',
  minWidth: 220,
};
