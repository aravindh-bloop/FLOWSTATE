/**
 * FlowState — Program Content Pages  (Phase 5)
 *
 * Routes:
 *   /month-1  →  Month 1 — Attention Architecture
 *   /month-2  →  Month 2 — Flow State Engineering
 *   /month-3  →  Month 3 — Identity & Integration
 *
 * Shows the monthly theme content, weekly checklists, and protocol
 * targets from the program_phases seed data.
 */
import { useParams } from 'react-router-dom';

import { Card, PageShell, Tag } from '../shared/page-shell';

// ─── Static program content (matches program_phases seed data in PRD) ─────────

const MONTHS = [
  {
    month: 1,
    theme: 'Attention Architecture',
    emoji: '🏗️',
    intro:
      'This month is about building the foundation. You will shift your sleep timing, establish morning light exposure, and create a consistent exercise window that anchors your circadian clock.',
    weeks: [
      {
        week: 1,
        name: 'Initial Assessment & Setup',
        wake: '07:30',
        bed: '00:00',
        caffeine: '14:00',
        light: 20,
        exercise: '07:00–07:30',
        peak: '09:00–12:00',
        checklist: [
          'Complete MEQ questionnaire with coach',
          'Set up Discord check-in channel',
          'Log baseline sleep diary (3 nights)',
          'Install wearable tracking app',
          'Identify your biggest morning friction point',
        ],
      },
      {
        week: 2,
        name: 'Interventions & Dashboard',
        wake: '07:15',
        bed: '23:45',
        caffeine: '13:00',
        light: 40,
        exercise: '06:45–07:15',
        peak: '09:00–12:00',
        checklist: [
          'Complete 7-day sleep diary',
          'Submit energy log to coach portal',
          'Identify top 3 attention disruptors',
          'Schedule first deep work block',
          'Week 2 milestone assessment with coach',
        ],
        milestone: true,
      },
      {
        week: 3,
        name: 'Optimization & Visualization',
        wake: '07:00',
        bed: '23:30',
        caffeine: '12:00',
        light: 40,
        exercise: '06:30–07:00',
        peak: '08:30–12:00',
        checklist: [
          'Build your visual peak window schedule',
          'Experiment with body doubling or focus music',
          'Track caffeine timing for 7 days',
          'Add morning light walk to routine',
          'Review week 2 data with coach',
        ],
      },
      {
        week: 4,
        name: 'Triggers & Schedule Building',
        wake: '07:00',
        bed: '23:30',
        caffeine: '12:00',
        light: 40,
        exercise: '06:30–07:00',
        peak: '08:30–12:00',
        checklist: [
          'Document your 3 peak-state entry triggers',
          'Build 30-day morning routine card',
          'Schedule Month 2 goals with coach',
          'Identify your biggest flow blockers',
          'Week 4 full review milestone',
        ],
        milestone: true,
      },
    ],
    tools: [
      { name: 'MEQ Chronotype Test', purpose: 'Identify your natural sleep timing' },
      { name: 'Oura / WHOOP / Garmin', purpose: 'Wearable HRV and sleep tracking' },
      { name: 'f.lux / Night Shift', purpose: 'Blue light filtering after sunset' },
      { name: 'Daylio or Bearable', purpose: 'Energy and mood logging' },
    ],
  },
  {
    month: 2,
    theme: 'Flow State Engineering',
    emoji: '⚡',
    intro:
      'With your circadian foundation set, Month 2 focuses on engineering predictable flow states. You will identify and stack your personal flow triggers, build deep work architecture, and protect recovery.',
    weeks: [
      {
        week: 5,
        name: 'Flow Triggers',
        wake: '06:45',
        bed: '23:30',
        caffeine: '11:00',
        light: 40,
        exercise: '06:15–06:45',
        peak: '08:00–12:00',
        checklist: [
          'Read: Flow by Mihaly Csikszentmihalyi (chapters 1–4)',
          'List your top 5 personal flow triggers',
          'Design a pre-work ritual (15–20 min)',
          'Block 90-min deep work sessions in calendar',
          'Log your first flow session',
        ],
      },
      {
        week: 6,
        name: 'Deep Work Architecture',
        wake: '06:45',
        bed: '23:30',
        caffeine: '11:00',
        light: 40,
        exercise: '06:15–06:45',
        peak: '08:00–12:00',
        checklist: [
          'Audit your workspace for distraction removal',
          'Implement phone-free morning block',
          'Track deep work hours vs shallow work',
          'Identify your biggest attention tax',
          'Week 6 milestone check-in with coach',
        ],
        milestone: true,
      },
      {
        week: 7,
        name: 'Recovery & Resilience',
        wake: '06:30',
        bed: '23:00',
        caffeine: '11:00',
        light: 45,
        exercise: '06:00–06:30',
        peak: '07:30–12:00',
        checklist: [
          'Schedule 2× weekly active recovery sessions',
          'Add 10-min post-lunch rest protocol',
          'Review HRV trend with coach',
          'Identify stress–sleep relationship patterns',
          'Practice single-tasking for one full day',
        ],
      },
      {
        week: 8,
        name: 'Consolidation',
        wake: '06:30',
        bed: '23:00',
        caffeine: '11:00',
        light: 45,
        exercise: '06:00–06:30',
        peak: '07:30–12:00',
        checklist: [
          'Build your personal "peak performance stack"',
          'Document your non-negotiable protocols',
          'Measure Month 2 vs Month 1 metrics',
          'Plan Month 3 identity goals with coach',
          'Week 8 consolidation milestone',
        ],
        milestone: true,
      },
    ],
    tools: [
      { name: 'Forest / Cold Turkey', purpose: 'Focus blocking during deep work' },
      { name: 'Toggl Track', purpose: 'Measure deep vs shallow work hours' },
      { name: 'Waking Up / Calm', purpose: 'Pre-session clarity meditation' },
      { name: 'Notion / Obsidian', purpose: 'Second brain for capture and review' },
    ],
  },
  {
    month: 3,
    theme: 'Identity & Integration',
    emoji: '🔮',
    intro:
      'Month 3 is about anchoring the habits into identity. The goal is not willpower — it is becoming the kind of person who naturally operates at this level. We design handoff, autonomy, and a post-program system.',
    weeks: [
      {
        week: 9,
        name: 'Identity Anchoring',
        wake: '06:30',
        bed: '23:00',
        caffeine: '11:00',
        light: 45,
        exercise: '06:00–06:30',
        peak: '07:30–11:30',
        checklist: [
          'Write your "performance identity statement"',
          'Review Month 1–2 data with coach',
          'Identify 3 habits that are now automatic',
          'Audit your environment for long-term support',
          'Begin journaling your post-program vision',
        ],
      },
      {
        week: 10,
        name: 'System Review',
        wake: '06:30',
        bed: '23:00',
        caffeine: '11:00',
        light: 45,
        exercise: '06:00–06:30',
        peak: '07:30–11:30',
        checklist: [
          'Full system audit: what worked, what did not',
          'Simplify your protocol to core 5 habits',
          'Build your post-program maintenance plan',
          'Identify your biggest remaining friction',
          'Schedule Day 90 final review session',
        ],
      },
      {
        week: 11,
        name: 'Autonomy Handoff',
        wake: '06:30',
        bed: '22:45',
        caffeine: '11:00',
        light: 45,
        exercise: '06:00–06:30',
        peak: '07:00–11:00',
        checklist: [
          'Practice self-coaching for one full week',
          'Review and adapt protocol without coach',
          'Document your decision framework for tough days',
          'Build 90-day post-program habit calendar',
          'Write letter to future self',
        ],
      },
      {
        week: 12,
        name: 'Day 90 Final Review',
        wake: '06:30',
        bed: '22:45',
        caffeine: '11:00',
        light: 45,
        exercise: '06:00–06:30',
        peak: '07:00–11:00',
        checklist: [
          'Complete final MEQ re-test',
          'Submit final energy and focus log',
          'Compare Day 1 vs Day 90 data with coach',
          'Celebrate progress — acknowledge the shift',
          'Final milestone and program completion',
        ],
        milestone: true,
      },
    ],
    tools: [
      { name: 'Atomic Habits by James Clear', purpose: 'Identity-based habit architecture' },
      { name: 'Personal journal', purpose: 'Weekly reflection and self-coaching' },
      { name: 'Annual review template', purpose: 'Quarterly performance review habit' },
      { name: 'Habit tracking app (Streaks)', purpose: 'Maintain streaks post-program' },
    ],
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function Component() {
  const { monthNum } = useParams<{ monthNum: string }>();
  const month = MONTHS.find(m => m.month === Number(monthNum));

  if (!month) {
    return (
      <PageShell title="Program">
        <p style={{ color: 'var(--affine-text-secondary-color)', fontSize: 14 }}>
          Month not found. Use /month-1, /month-2, or /month-3.
        </p>
      </PageShell>
    );
  }

  return (
    <PageShell
      title={`Month ${month.month} — ${month.theme}`}
      subtitle={`${month.emoji} Weeks ${(month.month - 1) * 4 + 1}–${month.month * 4}`}
    >
      {/* Intro */}
      <Card style={{ marginBottom: 24 }}>
        <p
          style={{
            fontSize: 14,
            lineHeight: 1.75,
            color: 'var(--affine-text-primary-color)',
            margin: 0,
          }}
        >
          {month.intro}
        </p>
      </Card>

      {/* Weeks */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 32 }}>
        {month.weeks.map(week => (
          <WeekCard key={week.week} week={week} />
        ))}
      </div>

      {/* Tools & resources */}
      <Card>
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--affine-text-secondary-color)',
            marginBottom: 12,
          }}
        >
          Recommended Tools This Month
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 10,
          }}
        >
          {month.tools.map(tool => (
            <div
              key={tool.name}
              style={{
                background: 'var(--affine-background-primary-color)',
                border: '1px solid var(--affine-border-color)',
                borderRadius: 8,
                padding: '10px 12px',
              }}
            >
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 13,
                  color: 'var(--affine-text-primary-color)',
                  marginBottom: 2,
                }}
              >
                {tool.name}
              </div>
              <div
                style={{ fontSize: 12, color: 'var(--affine-text-secondary-color)' }}
              >
                {tool.purpose}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </PageShell>
  );
}

// ─── Week card ────────────────────────────────────────────────────────────────

interface WeekData {
  week: number;
  name: string;
  wake: string;
  bed: string;
  caffeine: string;
  light: number;
  exercise: string;
  peak: string;
  checklist: string[];
  milestone?: boolean;
}

function WeekCard({ week }: { week: WeekData }) {
  return (
    <Card>
      {/* Week header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 14,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'var(--affine-primary-color)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 13,
            flexShrink: 0,
          }}
        >
          {week.week}
        </div>
        <div>
          <div
            style={{
              fontWeight: 700,
              fontSize: 14,
              color: 'var(--affine-text-primary-color)',
            }}
          >
            Week {week.week}: {week.name}
          </div>
        </div>
        {week.milestone && <Tag color="blue">📍 Milestone</Tag>}
      </div>

      {/* Two columns: targets + checklist */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
        }}
      >
        {/* Protocol targets */}
        <div>
          <ColumnLabel>Protocol Targets</ColumnLabel>
          <TargetRow label="☀️ Wake" value={week.wake} />
          <TargetRow label="🌙 Bedtime" value={week.bed} />
          <TargetRow label="☕ Caffeine" value={week.caffeine} />
          <TargetRow label="🌿 Light" value={`${week.light} min`} />
          <TargetRow label="🏃 Exercise" value={week.exercise} />
          <TargetRow label="🧠 Peak" value={week.peak} />
        </div>

        {/* Checklist */}
        <div>
          <ColumnLabel>Weekly Checklist</ColumnLabel>
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            {week.checklist.map((item, i) => (
              <li
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                  fontSize: 12,
                  color: 'var(--affine-text-primary-color)',
                  lineHeight: 1.5,
                }}
              >
                <span
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 4,
                    border: '1.5px solid var(--affine-border-color)',
                    flexShrink: 0,
                    marginTop: 1,
                    display: 'inline-block',
                  }}
                />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}

function ColumnLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: 'var(--affine-text-secondary-color)',
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  );
}

function TargetRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: 12,
        padding: '4px 0',
        borderBottom: '1px solid var(--affine-border-color)',
      }}
    >
      <span style={{ color: 'var(--affine-text-secondary-color)' }}>{label}</span>
      <span
        style={{
          fontWeight: 600,
          color: 'var(--affine-text-primary-color)',
          fontFamily: 'var(--affine-font-mono)',
          fontSize: 11,
        }}
      >
        {value}
      </span>
    </div>
  );
}
