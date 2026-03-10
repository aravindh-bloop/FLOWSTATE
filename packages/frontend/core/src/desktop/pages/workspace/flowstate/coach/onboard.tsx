/**
 * FlowState — Onboard New Client  (Phase 4)
 *
 * Route: /onboard (inside coach workspace)
 * Multi-step form that collects all fields required to call
 * POST /api/clients/onboard, which triggers Discord channel
 * provisioning, calendar seeding, and welcome message.
 */
import { useFlowStateData } from '@affine/core/modules/flowstate';
import { useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Btn, Card, ErrorBanner, PageShell } from '../shared/page-shell';

// ─── Steps ────────────────────────────────────────────────────────────────────

const STEPS = [
  { label: 'Identity', icon: '👤' },
  { label: 'Program', icon: '📅' },
  { label: 'Protocol', icon: '⚡' },
  { label: 'Schedule', icon: '🕐' },
  { label: 'Confirm', icon: '✓' },
];

type FormData = {
  // Step 1 — Identity
  full_name: string;
  email: string;
  discord_user_id: string;
  // Step 2 — Program
  program_start_date: string;
  primary_goal: string;
  signature_focus_areas: string;
  // Step 3 — Protocol (derived from MEQ)
  meq_score: number;
  // Step 4 — Schedule
  checkin_time_am: string;
  checkin_time_pm: string;
};

const INITIAL: FormData = {
  full_name: '',
  email: '',
  discord_user_id: '',
  program_start_date: new Date().toISOString().split('T')[0],
  primary_goal: '',
  signature_focus_areas: '',
  meq_score: 50,
  checkin_time_am: '06:30',
  checkin_time_pm: '20:00',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function Component() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const { onboardClient } = useFlowStateData();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(INITIAL);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const set = useCallback(
    <K extends keyof FormData>(k: K, v: FormData[K]) =>
      setForm(f => ({ ...f, [k]: v })),
    []
  );

  const chronotype = (score: number) => {
    if (score > 58) return 'Morning';
    if (score >= 42) return 'Intermediate';
    return 'Evening';
  };

  const submit = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await onboardClient({
        ...form,
        meq_score: Number(form.meq_score),
        chronotype: chronotype(form.meq_score),
        signature_focus_areas: form.signature_focus_areas
          .split(',')
          .map(s => s.trim())
          .filter(Boolean),
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Onboarding failed');
    } finally {
      setBusy(false);
    }
  }, [form, onboardClient]);

  if (success) {
    return (
      <PageShell title="Onboarding Complete!">
        <div
          style={{ maxWidth: 480, textAlign: 'center', margin: '80px auto' }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
          <h2
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: 'var(--affine-text-primary-color)',
              marginBottom: 8,
            }}
          >
            {form.full_name} is onboarded!
          </h2>
          <p
            style={{
              fontSize: 14,
              color: 'var(--affine-text-secondary-color)',
              marginBottom: 24,
              lineHeight: 1.6,
            }}
          >
            Their Discord channel has been provisioned, calendar seeded, and a
            welcome message sent. The client portal invite email is on its way.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <Btn onClick={() => navigate(`/workspace/${workspaceId}/clients`)}>
              View All Clients
            </Btn>
            <Btn
              variant="secondary"
              onClick={() => {
                setForm(INITIAL);
                setStep(0);
                setSuccess(false);
              }}
            >
              Onboard Another
            </Btn>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Onboard New Client"
      subtitle="Completes all 12 provisioning steps automatically"
    >
      {/* Step indicator */}
      <StepIndicator current={step} steps={STEPS} />

      {error && <ErrorBanner message={error} />}

      <div style={{ maxWidth: 600 }}>
        <Card style={{ marginBottom: 20 }}>
          {step === 0 && <StepIdentity form={form} set={set} />}
          {step === 1 && <StepProgram form={form} set={set} />}
          {step === 2 && (
            <StepProtocol
              form={form}
              set={set}
              chronotype={chronotype(form.meq_score)}
            />
          )}
          {step === 3 && <StepSchedule form={form} set={set} />}
          {step === 4 && (
            <StepConfirm form={form} chronotype={chronotype(form.meq_score)} />
          )}
        </Card>

        {/* Navigation */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          {step > 0 && (
            <Btn variant="secondary" onClick={() => setStep(s => s - 1)}>
              ← Back
            </Btn>
          )}
          {step < STEPS.length - 1 ? (
            <Btn onClick={() => setStep(s => s + 1)}>Next →</Btn>
          ) : (
            <Btn onClick={() => void submit()} disabled={busy}>
              {busy ? 'Onboarding…' : 'Onboard Client'}
            </Btn>
          )}
        </div>
      </div>
    </PageShell>
  );
}

// ─── Step forms ───────────────────────────────────────────────────────────────

function StepIdentity({
  form,
  set,
}: {
  form: FormData;
  set: <K extends keyof FormData>(k: K, v: FormData[K]) => void;
}) {
  return (
    <>
      <StepTitle>Client Identity</StepTitle>
      <FieldGroup>
        <Field label="Full Name">
          <input
            value={form.full_name}
            onChange={e => set('full_name', e.target.value)}
            placeholder="Jane Smith"
            style={fieldStyle}
          />
        </Field>
        <Field label="Email Address">
          <input
            type="email"
            value={form.email}
            onChange={e => set('email', e.target.value)}
            placeholder="jane@example.com"
            style={fieldStyle}
          />
        </Field>
        <Field label="Discord User ID (optional)">
          <input
            value={form.discord_user_id}
            onChange={e => set('discord_user_id', e.target.value)}
            placeholder="123456789012345678"
            style={fieldStyle}
          />
          <Hint>
            18-digit Discord user ID. Used to create their private channel.
          </Hint>
        </Field>
      </FieldGroup>
    </>
  );
}

function StepProgram({
  form,
  set,
}: {
  form: FormData;
  set: <K extends keyof FormData>(k: K, v: FormData[K]) => void;
}) {
  const endDate = new Date(
    new Date(form.program_start_date).getTime() + 90 * 86_400_000
  )
    .toISOString()
    .split('T')[0];

  return (
    <>
      <StepTitle>Program Setup</StepTitle>
      <FieldGroup>
        <Field label="Program Start Date">
          <input
            type="date"
            value={form.program_start_date}
            onChange={e => set('program_start_date', e.target.value)}
            style={fieldStyle}
          />
          <Hint>End date (90 days): {endDate}</Hint>
        </Field>
        <Field label="Primary Goal">
          <textarea
            value={form.primary_goal}
            onChange={e => set('primary_goal', e.target.value)}
            rows={3}
            placeholder="e.g. Shift peak focus window earlier, improve deep work capacity"
            style={{ ...fieldStyle, resize: 'vertical' }}
          />
        </Field>
        <Field label="Signature Focus Areas (comma separated)">
          <input
            value={form.signature_focus_areas}
            onChange={e => set('signature_focus_areas', e.target.value)}
            placeholder="sleep, exercise, deep work"
            style={fieldStyle}
          />
        </Field>
      </FieldGroup>
    </>
  );
}

function StepProtocol({
  form,
  set,
  chronotype,
}: {
  form: FormData;
  set: <K extends keyof FormData>(k: K, v: FormData[K]) => void;
  chronotype: string;
}) {
  return (
    <>
      <StepTitle>MEQ Assessment</StepTitle>
      <p
        style={{
          fontSize: 13,
          color: 'var(--affine-text-secondary-color)',
          marginBottom: 16,
          lineHeight: 1.6,
        }}
      >
        Enter the client&apos;s Morningness-Eveningness Questionnaire score
        (16–86). The chronotype and Week 1 protocol targets are derived
        automatically.
      </p>
      <FieldGroup>
        <Field label={`MEQ Score (16–86) → Chronotype: ${chronotype}`}>
          <input
            type="number"
            min={16}
            max={86}
            value={form.meq_score}
            onChange={e => set('meq_score', Number(e.target.value))}
            style={fieldStyle}
          />
        </Field>
        <div
          style={{
            background: 'var(--affine-background-primary-color)',
            border: '1px solid var(--affine-border-color)',
            borderRadius: 8,
            padding: '12px 16px',
            fontSize: 12,
          }}
        >
          <strong style={{ color: 'var(--affine-text-primary-color)' }}>
            Chronotype table:
          </strong>
          <div
            style={{
              marginTop: 6,
              color: 'var(--affine-text-secondary-color)',
            }}
          >
            <div>• &gt;58 = Morning type</div>
            <div>• 42–58 = Intermediate type</div>
            <div>• &lt;42 = Evening type</div>
          </div>
        </div>
      </FieldGroup>
    </>
  );
}

function StepSchedule({
  form,
  set,
}: {
  form: FormData;
  set: <K extends keyof FormData>(k: K, v: FormData[K]) => void;
}) {
  return (
    <>
      <StepTitle>Check-In Schedule</StepTitle>
      <p
        style={{
          fontSize: 13,
          color: 'var(--affine-text-secondary-color)',
          marginBottom: 16,
          lineHeight: 1.6,
        }}
      >
        Set the times when the Discord bot will send daily reminders. These can
        be adjusted per client later.
      </p>
      <FieldGroup>
        <Field label="Morning Check-In Time">
          <input
            type="time"
            value={form.checkin_time_am}
            onChange={e => set('checkin_time_am', e.target.value)}
            style={fieldStyle}
          />
        </Field>
        <Field label="Evening Check-In Time">
          <input
            type="time"
            value={form.checkin_time_pm}
            onChange={e => set('checkin_time_pm', e.target.value)}
            style={fieldStyle}
          />
        </Field>
      </FieldGroup>
    </>
  );
}

function StepConfirm({
  form,
  chronotype,
}: {
  form: FormData;
  chronotype: string;
}) {
  const rows: Array<[string, string]> = [
    ['Full Name', form.full_name || '—'],
    ['Email', form.email || '—'],
    ['Discord User ID', form.discord_user_id || '(set later)'],
    ['Program Start', form.program_start_date],
    ['Primary Goal', form.primary_goal || '—'],
    ['Focus Areas', form.signature_focus_areas || '—'],
    ['MEQ Score', String(form.meq_score)],
    ['Chronotype', chronotype],
    ['AM Check-In', form.checkin_time_am],
    ['PM Check-In', form.checkin_time_pm],
  ];

  return (
    <>
      <StepTitle>Confirm Details</StepTitle>
      <p
        style={{
          fontSize: 13,
          color: 'var(--affine-text-secondary-color)',
          marginBottom: 16,
          lineHeight: 1.6,
        }}
      >
        Review everything before submitting. Clicking &quot;Onboard Client&quot;
        will automatically provision Discord, Affine workspace, calendar events,
        and send the welcome message.
      </p>
      <div>
        {rows.map(([label, value]) => (
          <div
            key={label}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '8px 0',
              borderBottom: '1px solid var(--affine-border-color)',
              fontSize: 13,
            }}
          >
            <span style={{ color: 'var(--affine-text-secondary-color)' }}>
              {label}
            </span>
            <span
              style={{
                fontWeight: 600,
                color: 'var(--affine-text-primary-color)',
                maxWidth: 300,
                textAlign: 'right',
              }}
            >
              {value}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

// ─── Layout helpers ───────────────────────────────────────────────────────────

function StepIndicator({
  current,
  steps,
}: {
  current: number;
  steps: typeof STEPS;
}) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 0,
        marginBottom: 24,
        borderRadius: 10,
        overflow: 'hidden',
        border: '1px solid var(--affine-border-color)',
      }}
    >
      {steps.map((s, i) => (
        <div
          key={s.label}
          style={{
            flex: 1,
            padding: '10px 8px',
            textAlign: 'center',
            fontSize: 12,
            fontWeight: i === current ? 700 : 400,
            background:
              i < current
                ? 'var(--affine-background-success-color)'
                : i === current
                  ? 'var(--affine-primary-color)'
                  : 'var(--affine-background-secondary-color)',
            color:
              i <= current
                ? i === current
                  ? '#fff'
                  : 'var(--affine-success-color)'
                : 'var(--affine-text-secondary-color)',
            borderRight:
              i < steps.length - 1
                ? '1px solid var(--affine-border-color)'
                : 'none',
          }}
        >
          {s.icon} {s.label}
        </div>
      ))}
    </div>
  );
}

function StepTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 15,
        fontWeight: 700,
        color: 'var(--affine-text-primary-color)',
        marginBottom: 16,
      }}
    >
      {children}
    </div>
  );
}

function FieldGroup({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {children}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        style={{
          display: 'block',
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          color: 'var(--affine-text-secondary-color)',
          marginBottom: 4,
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        margin: '4px 0 0',
        fontSize: 11,
        color: 'var(--affine-text-disable-color)',
      }}
    >
      {children}
    </p>
  );
}

const fieldStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid var(--affine-border-color)',
  background: 'var(--affine-background-primary-color)',
  color: 'var(--affine-text-primary-color)',
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
};
