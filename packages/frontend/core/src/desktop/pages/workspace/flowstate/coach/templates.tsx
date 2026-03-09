/**
 * FlowState — Template Library  (Phase 4)
 *
 * Route: /templates (inside coach workspace)
 * Editable list of all 25 intervention message templates.
 * Coach can create, edit, and soft-delete (active=false) templates.
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
import type { InterventionTemplate } from '../shared/types';

// ─── Trigger labels ───────────────────────────────────────────────────────────

const TRIGGER_OPTIONS = [
  'low_adherence',
  'missed_checkins_2',
  'missed_checkins_3plus',
  'phase_transition',
  'milestone_week',
  'sleep_declining',
  'high_adherence_streak',
  'manual',
];

function triggerLabel(tc: string): string {
  const map: Record<string, string> = {
    low_adherence: 'Low Adherence',
    missed_checkins_2: '2 Missed',
    missed_checkins_3plus: '3+ Missed',
    phase_transition: 'Phase Transition',
    milestone_week: 'Milestone Week',
    sleep_declining: 'Sleep Declining',
    high_adherence_streak: 'High Streak',
    manual: 'Manual',
  };
  return map[tc] ?? tc;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Component() {
  const { fetchTemplates, createTemplate, updateTemplate, deleteTemplate } =
    useFlowStateData();

  const { data, loading, error, reload } = useAsync<InterventionTemplate[]>(
    () => fetchTemplates() as Promise<InterventionTemplate[]>,
    [fetchTemplates]
  );

  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState<Partial<InterventionTemplate>>({});
  const [busy, setBusy] = useState(false);
  const [filterActive, setFilterActive] = useState(true);

  const startNew = useCallback(() => {
    setForm({
      code: '',
      name: '',
      trigger_condition: 'manual',
      message_template: '',
      active: true,
    });
    setEditingId('new');
  }, []);

  const startEdit = useCallback((t: InterventionTemplate) => {
    setForm({ ...t });
    setEditingId(t.id);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setForm({});
  }, []);

  const save = useCallback(async () => {
    setBusy(true);
    try {
      if (editingId === 'new') {
        await createTemplate(form);
      } else if (editingId) {
        await updateTemplate(editingId, form);
      }
      setEditingId(null);
      setForm({});
      reload();
    } finally {
      setBusy(false);
    }
  }, [editingId, form, createTemplate, updateTemplate, reload]);

  const remove = useCallback(
    async (id: string) => {
      setBusy(true);
      try {
        await deleteTemplate(id);
        reload();
      } finally {
        setBusy(false);
      }
    },
    [deleteTemplate, reload]
  );

  const templates = data ?? [];
  const filtered = templates.filter(t =>
    filterActive ? t.active : !t.active
  );

  return (
    <PageShell
      title="Template Library"
      subtitle={`${templates.filter(t => t.active).length} active templates`}
      actions={
        <>
          <Btn variant="secondary" onClick={reload} small>
            ↻ Refresh
          </Btn>
          <Btn onClick={startNew} small>
            + New Template
          </Btn>
        </>
      }
    >
      {error && <ErrorBanner message={error} />}

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[
          { label: 'Active', val: true },
          { label: 'Archived', val: false },
        ].map(({ label, val }) => (
          <button
            key={label}
            onClick={() => setFilterActive(val)}
            style={{
              padding: '5px 14px',
              borderRadius: 6,
              fontSize: 12,
              border: '1px solid var(--affine-border-color)',
              cursor: 'pointer',
              background:
                filterActive === val
                  ? 'var(--affine-primary-color)'
                  : 'var(--affine-background-secondary-color)',
              color: filterActive === val ? '#fff' : 'var(--affine-text-secondary-color)',
              fontWeight: filterActive === val ? 600 : 400,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* New template form */}
      {editingId === 'new' && (
        <TemplateForm
          form={form}
          onChange={setForm}
          onSave={() => void save()}
          onCancel={cancelEdit}
          busy={busy}
          isNew
        />
      )}

      {loading ? (
        <LoadingSkeleton rows={5} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(t =>
            editingId === t.id ? (
              <TemplateForm
                key={t.id}
                form={form}
                onChange={setForm}
                onSave={() => void save()}
                onCancel={cancelEdit}
                busy={busy}
              />
            ) : (
              <TemplateRow
                key={t.id}
                template={t}
                onEdit={() => startEdit(t)}
                onDelete={() => void remove(t.id)}
                disabled={busy || editingId !== null}
              />
            )
          )}
          {filtered.length === 0 && editingId !== 'new' && (
            <div
              style={{
                textAlign: 'center',
                padding: '48px 0',
                color: 'var(--affine-text-secondary-color)',
                fontSize: 14,
              }}
            >
              No {filterActive ? 'active' : 'archived'} templates.
            </div>
          )}
        </div>
      )}
    </PageShell>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TemplateRow({
  template,
  onEdit,
  onDelete,
  disabled,
}: {
  template: InterventionTemplate;
  onEdit: () => void;
  onDelete: () => void;
  disabled: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 12,
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 4,
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--affine-primary-color)',
                fontFamily: 'var(--affine-font-mono)',
              }}
            >
              {template.code}
            </span>
            <span
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--affine-text-primary-color)',
              }}
            >
              {template.name}
            </span>
            <Tag color="neutral">{triggerLabel(template.trigger_condition)}</Tag>
            <span
              style={{
                fontSize: 11,
                color: 'var(--affine-text-disable-color)',
              }}
            >
              Used {template.use_count}×
            </span>
          </div>
          {expanded ? (
            <div
              style={{
                fontSize: 13,
                lineHeight: 1.6,
                color: 'var(--affine-text-primary-color)',
                background: 'var(--affine-background-primary-color)',
                border: '1px solid var(--affine-border-color)',
                borderRadius: 6,
                padding: '10px 12px',
                marginTop: 8,
                whiteSpace: 'pre-wrap',
              }}
            >
              {template.message_template}
            </div>
          ) : (
            <p
              style={{
                fontSize: 12,
                color: 'var(--affine-text-secondary-color)',
                margin: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {template.message_template.slice(0, 120)}…
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <Btn
            variant="ghost"
            small
            onClick={() => setExpanded(e => !e)}
          >
            {expanded ? 'Collapse' : 'Preview'}
          </Btn>
          <Btn
            variant="secondary"
            small
            onClick={onEdit}
            disabled={disabled}
          >
            ✎ Edit
          </Btn>
          <Btn
            variant="danger"
            small
            onClick={onDelete}
            disabled={disabled}
          >
            Archive
          </Btn>
        </div>
      </div>
    </Card>
  );
}

function TemplateForm({
  form,
  onChange,
  onSave,
  onCancel,
  busy,
  isNew,
}: {
  form: Partial<InterventionTemplate>;
  onChange: (f: Partial<InterventionTemplate>) => void;
  onSave: () => void;
  onCancel: () => void;
  busy: boolean;
  isNew?: boolean;
}) {
  const set = (k: keyof InterventionTemplate, v: string) =>
    onChange({ ...form, [k]: v });

  return (
    <Card style={{ border: '1px solid var(--affine-primary-color)' }}>
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--affine-primary-color)',
          marginBottom: 16,
        }}
      >
        {isNew ? 'New Template' : 'Edit Template'}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <Field label="Code (e.g. INT-26)">
          <input
            value={form.code ?? ''}
            onChange={e => set('code', e.target.value)}
            style={fieldInputStyle}
          />
        </Field>
        <Field label="Name">
          <input
            value={form.name ?? ''}
            onChange={e => set('name', e.target.value)}
            style={fieldInputStyle}
          />
        </Field>
      </div>
      <Field label="Trigger Condition" style={{ marginBottom: 12 }}>
        <select
          value={form.trigger_condition ?? 'manual'}
          onChange={e => set('trigger_condition', e.target.value)}
          style={fieldInputStyle}
        >
          {TRIGGER_OPTIONS.map(o => (
            <option key={o} value={o}>
              {triggerLabel(o)}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Message Template (use {{variables}} for personalisation)">
        <textarea
          value={form.message_template ?? ''}
          onChange={e => set('message_template', e.target.value)}
          rows={5}
          style={{ ...fieldInputStyle, resize: 'vertical' }}
        />
      </Field>
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <Btn onClick={onSave} disabled={busy} small>
          Save Template
        </Btn>
        <Btn variant="secondary" onClick={onCancel} small>
          Cancel
        </Btn>
      </div>
    </Card>
  );
}

function Field({
  label,
  children,
  style,
}: {
  label: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div style={style}>
      <label
        style={{
          display: 'block',
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--affine-text-secondary-color)',
          marginBottom: 4,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

const fieldInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 6,
  border: '1px solid var(--affine-border-color)',
  background: 'var(--affine-background-primary-color)',
  color: 'var(--affine-text-primary-color)',
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
};
