/**
 * FlowState — Intervention Queue  (Phase 4)
 *
 * Route: /intervention-queue (inside coach workspace)
 * Lists all pending interventions. Coach can approve, edit final message,
 * or dismiss each one. Approved interventions are picked up by the bot.
 */
import { useCallback, useState } from 'react';

import { useFlowStateData } from '@affine/core/modules/flowstate';

import {
  Btn,
  Card,
  ErrorBanner,
  LoadingSkeleton,
  PageShell,
  Tag,
} from '../shared/page-shell';
import { useAsync } from '../shared/use-async';
import type { Intervention } from '../shared/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function triggerLabel(tc: string): string {
  const map: Record<string, string> = {
    low_adherence: 'Low Adherence',
    missed_checkins_2: '2 Missed Check-Ins',
    missed_checkins_3plus: '3+ Missed Check-Ins',
    phase_transition: 'Phase Transition',
    milestone_week: 'Milestone Week',
    sleep_declining: 'Sleep Declining',
    high_adherence_streak: 'High Streak 🎉',
    manual: 'Manual',
  };
  return map[tc] ?? tc;
}

function triggerColor(tc: string): 'red' | 'amber' | 'green' | 'blue' | 'neutral' {
  if (tc.startsWith('missed')) return 'red';
  if (tc === 'low_adherence' || tc === 'sleep_declining') return 'amber';
  if (tc === 'high_adherence_streak') return 'green';
  if (tc === 'phase_transition' || tc === 'milestone_week') return 'blue';
  return 'neutral';
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return 'Just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Component() {
  const {
    fetchAllInterventions,
    approveIntervention,
    editIntervention,
    dismissIntervention,
  } = useFlowStateData();

  const { data, loading, error, reload } = useAsync<Intervention[]>(
    () =>
      fetchAllInterventions().then(d => {
        const all = d as Intervention[];
        return all.filter(i => i.status === 'pending' || i.status === 'modified');
      }),
    [fetchAllInterventions]
  );

  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const handleApprove = useCallback(
    async (id: string) => {
      setBusy(id);
      try {
        await approveIntervention(id);
        reload();
      } finally {
        setBusy(null);
      }
    },
    [approveIntervention, reload]
  );

  const handleDismiss = useCallback(
    async (id: string) => {
      setBusy(id);
      try {
        await dismissIntervention(id);
        reload();
      } finally {
        setBusy(null);
      }
    },
    [dismissIntervention, reload]
  );

  const startEdit = useCallback((intervention: Intervention) => {
    setEditing(intervention.id);
    setEditText(intervention.final_message ?? intervention.draft_message);
  }, []);

  const saveEdit = useCallback(
    async (id: string) => {
      setBusy(id);
      try {
        await editIntervention(id, editText);
        setEditing(null);
        reload();
      } finally {
        setBusy(null);
      }
    },
    [editIntervention, editText, reload]
  );

  const interventions = data ?? [];
  const pending = interventions.length;

  return (
    <PageShell
      title="Intervention Queue"
      subtitle={
        pending > 0
          ? `${pending} intervention${pending !== 1 ? 's' : ''} awaiting review`
          : 'All clear — no pending interventions'
      }
      actions={
        <Btn variant="secondary" onClick={reload} small>
          ↻ Refresh
        </Btn>
      }
    >
      {error && <ErrorBanner message={error} />}

      {loading ? (
        <LoadingSkeleton rows={4} />
      ) : interventions.length === 0 ? (
        <EmptyQueue />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {interventions.map(inv => (
            <InterventionCard
              key={inv.id}
              inv={inv}
              isEditing={editing === inv.id}
              editText={editText}
              isBusy={busy === inv.id}
              onEditText={setEditText}
              onStartEdit={() => startEdit(inv)}
              onSaveEdit={() => void saveEdit(inv.id)}
              onCancelEdit={() => setEditing(null)}
              onApprove={() => void handleApprove(inv.id)}
              onDismiss={() => void handleDismiss(inv.id)}
            />
          ))}
        </div>
      )}
    </PageShell>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface CardProps {
  inv: Intervention;
  isEditing: boolean;
  editText: string;
  isBusy: boolean;
  onEditText: (t: string) => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onApprove: () => void;
  onDismiss: () => void;
}

function InterventionCard({
  inv,
  isEditing,
  editText,
  isBusy,
  onEditText,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onApprove,
  onDismiss,
}: CardProps) {
  const message = inv.final_message ?? inv.draft_message;

  return (
    <Card>
      {/* Header row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 12,
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: 'var(--affine-text-primary-color)',
              }}
            >
              {inv.client_name ?? 'Client'}
            </span>
            <Tag color={triggerColor(inv.trigger_condition)}>
              {triggerLabel(inv.trigger_condition)}
            </Tag>
            {inv.status === 'modified' && <Tag color="blue">Edited</Tag>}
          </div>
          <span
            style={{ fontSize: 11, color: 'var(--affine-text-secondary-color)' }}
          >
            Created {timeAgo(inv.created_at)}
          </span>
        </div>
      </div>

      {/* Message */}
      {isEditing ? (
        <textarea
          value={editText}
          onChange={e => onEditText(e.target.value)}
          rows={5}
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
      ) : (
        <div
          style={{
            background: 'var(--affine-background-primary-color)',
            border: '1px solid var(--affine-border-color)',
            borderRadius: 8,
            padding: '12px 14px',
            fontSize: 13,
            lineHeight: 1.65,
            color: 'var(--affine-text-primary-color)',
            marginBottom: 12,
            whiteSpace: 'pre-wrap',
          }}
        >
          {message}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        {isEditing ? (
          <>
            <Btn onClick={onSaveEdit} disabled={isBusy} small>
              Save Edit
            </Btn>
            <Btn variant="secondary" onClick={onCancelEdit} small>
              Cancel
            </Btn>
          </>
        ) : (
          <>
            <Btn onClick={onApprove} disabled={isBusy} small>
              ✓ Approve & Send
            </Btn>
            <Btn variant="secondary" onClick={onStartEdit} small>
              ✎ Edit
            </Btn>
            <Btn variant="danger" onClick={onDismiss} disabled={isBusy} small>
              Dismiss
            </Btn>
          </>
        )}
      </div>
    </Card>
  );
}

function EmptyQueue() {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '64px 24px',
        color: 'var(--affine-text-secondary-color)',
      }}
    >
      <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
        All clear
      </div>
      <div style={{ fontSize: 13 }}>
        No interventions are waiting for review right now.
      </div>
    </div>
  );
}
