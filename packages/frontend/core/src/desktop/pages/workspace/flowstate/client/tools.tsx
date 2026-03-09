/**
 * FlowState — Tools & Resources  (Phase 5)
 *
 * Route: /tools (inside client workspace)
 * Software recommendations, links, and AI tool access information.
 * Static content — no API calls required.
 */

import { Card, PageShell, Tag } from '../shared/page-shell';

// ─── Static content ───────────────────────────────────────────────────────────

const CATEGORIES = [
  {
    id: 'wearables',
    title: 'Wearables & Tracking',
    emoji: '📊',
    tools: [
      {
        name: 'Oura Ring',
        type: 'Wearable',
        description:
          'Best-in-class HRV, sleep stages, and readiness score. Recommended for FlowState clients.',
        tag: 'Recommended',
        tagColor: 'green' as const,
      },
      {
        name: 'WHOOP 4.0',
        type: 'Wearable',
        description:
          'Continuous HRV monitoring with strain and recovery coaching. Great alternative to Oura.',
        tag: 'Alternative',
        tagColor: 'blue' as const,
      },
      {
        name: 'Garmin (any model)',
        type: 'Wearable',
        description:
          'Affordable sleep and HRV tracking with Body Battery energy score.',
        tag: 'Budget-friendly',
        tagColor: 'neutral' as const,
      },
      {
        name: 'Apple Watch (Series 9+)',
        type: 'Wearable',
        description:
          'Convenient if already owned. Sleep tracking is decent but HRV less accurate than Oura.',
        tag: 'Convenient',
        tagColor: 'neutral' as const,
      },
    ],
  },
  {
    id: 'focus',
    title: 'Focus & Deep Work',
    emoji: '🧠',
    tools: [
      {
        name: 'Forest App',
        type: 'iOS / Android',
        description:
          'Gamified phone lock timer. Plant a tree for every deep work session — kills the tree if you unlock.',
        tag: 'Free tier',
        tagColor: 'green' as const,
      },
      {
        name: 'Cold Turkey Blocker',
        type: 'Mac / Windows',
        description:
          'Nuclear-grade website and app blocker. Cannot be bypassed until the timer ends.',
        tag: 'Recommended',
        tagColor: 'green' as const,
      },
      {
        name: 'Toggl Track',
        type: 'All platforms',
        description:
          'Simple time tracker. Use it to measure deep work vs shallow work hours per week.',
        tag: 'Free',
        tagColor: 'green' as const,
      },
      {
        name: 'Brain.fm',
        type: 'Web / iOS',
        description:
          'AI-generated functional music scientifically designed to increase focus within 15 minutes.',
        tag: 'Paid',
        tagColor: 'amber' as const,
      },
    ],
  },
  {
    id: 'sleep',
    title: 'Sleep Optimization',
    emoji: '💤',
    tools: [
      {
        name: 'f.lux (Mac / Windows)',
        type: 'Desktop',
        description:
          'Automatically shifts screen colour temperature at sunset to reduce blue light exposure.',
        tag: 'Free',
        tagColor: 'green' as const,
      },
      {
        name: 'Night Shift / True Tone',
        type: 'iOS / macOS',
        description:
          'Apple\'s built-in blue light filter. Less aggressive than f.lux but zero setup required.',
        tag: 'Built-in',
        tagColor: 'neutral' as const,
      },
      {
        name: 'Chili Sleep (OOLER)',
        type: 'Hardware',
        description:
          'Temperature-controlled mattress pad. Best sleep upgrade if you overheat at night.',
        tag: 'Premium',
        tagColor: 'amber' as const,
      },
      {
        name: 'Loop Earplugs (Dream)',
        type: 'Hardware',
        description:
          'Comfortable sleep earplugs that reduce ambient noise without full occlusion.',
        tag: 'Affordable',
        tagColor: 'green' as const,
      },
    ],
  },
  {
    id: 'ai',
    title: 'AI Tools Access',
    emoji: '🤖',
    tools: [
      {
        name: 'Claude (Anthropic)',
        type: 'Web / API',
        description:
          'Used by FlowState for your weekly AI summaries. Claude Sonnet analyses your 7-day data every Sunday night.',
        tag: 'Used by FlowState',
        tagColor: 'green' as const,
      },
      {
        name: 'Gemini Flash 2.0',
        type: 'Google AI',
        description:
          'Analyses your check-in photos for protocol compliance. Fast, multimodal vision model.',
        tag: 'Used by FlowState',
        tagColor: 'green' as const,
      },
      {
        name: 'ChatGPT / GPT-4o',
        type: 'Web / iOS',
        description:
          'Useful for general productivity: summarise articles, draft communications, explore ideas.',
        tag: 'Self-service',
        tagColor: 'neutral' as const,
      },
      {
        name: 'Perplexity',
        type: 'Web / iOS',
        description:
          'AI-powered search with citations. Better than Google for research-heavy questions.',
        tag: 'Free tier',
        tagColor: 'green' as const,
      },
    ],
  },
  {
    id: 'reading',
    title: 'Essential Reading',
    emoji: '📚',
    tools: [
      {
        name: 'Why We Sleep — Matthew Walker',
        type: 'Book',
        description:
          'The definitive science of sleep. Essential for understanding why the protocol targets matter.',
        tag: 'Core reading',
        tagColor: 'green' as const,
      },
      {
        name: 'Flow — Mihaly Csikszentmihalyi',
        type: 'Book',
        description:
          'The original research on optimal experience and flow states. Read during Month 2.',
        tag: 'Month 2',
        tagColor: 'blue' as const,
      },
      {
        name: 'Atomic Habits — James Clear',
        type: 'Book',
        description:
          'Identity-based habit change. Central to Month 3\'s integration phase.',
        tag: 'Month 3',
        tagColor: 'blue' as const,
      },
      {
        name: 'Deep Work — Cal Newport',
        type: 'Book',
        description:
          'The case for distraction-free concentration. Foundational for the peak window work.',
        tag: 'Month 2',
        tagColor: 'blue' as const,
      },
    ],
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function Component() {
  return (
    <PageShell
      title="Tools & Resources"
      subtitle="Everything you need for the 90-day program"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        {CATEGORIES.map(cat => (
          <section key={cat.id}>
            {/* Category header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 14,
              }}
            >
              <span style={{ fontSize: 18 }}>{cat.emoji}</span>
              <h2
                style={{
                  margin: 0,
                  fontSize: 16,
                  fontWeight: 700,
                  color: 'var(--affine-text-primary-color)',
                }}
              >
                {cat.title}
              </h2>
            </div>

            {/* Tool grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: 12,
              }}
            >
              {cat.tools.map(tool => (
                <ToolCard key={tool.name} tool={tool} />
              ))}
            </div>
          </section>
        ))}

        {/* Discord section */}
        <Card
          style={{
            background: 'var(--affine-primary-color-08)',
            border: '1px solid var(--affine-primary-color)',
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: 12,
              alignItems: 'flex-start',
            }}
          >
            <span style={{ fontSize: 28, flexShrink: 0 }}>💬</span>
            <div>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 15,
                  color: 'var(--affine-text-primary-color)',
                  marginBottom: 4,
                }}
              >
                Your Check-In Channel
              </div>
              <p
                style={{
                  fontSize: 13,
                  lineHeight: 1.65,
                  color: 'var(--affine-text-primary-color)',
                  margin: '0 0 8px',
                }}
              >
                All daily check-ins happen in your private Discord channel. The
                FlowState bot sends you morning (🌅) and evening (🌙) prompts
                at your scheduled times. Reply with a photo and a short note to
                submit your check-in.
              </p>
              <p
                style={{
                  fontSize: 12,
                  color: 'var(--affine-text-secondary-color)',
                  margin: 0,
                }}
              >
                Photo submissions are analysed by Gemini Flash 2.0 · AI feedback
                is posted within 30 seconds · Your coach reviews all check-ins
              </p>
            </div>
          </div>
        </Card>
      </div>
    </PageShell>
  );
}

// ─── Tool card ────────────────────────────────────────────────────────────────

function ToolCard({
  tool,
}: {
  tool: {
    name: string;
    type: string;
    description: string;
    tag: string;
    tagColor: 'green' | 'amber' | 'red' | 'blue' | 'neutral';
  };
}) {
  return (
    <Card style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 8,
        }}
      >
        <div
          style={{
            fontWeight: 700,
            fontSize: 13,
            color: 'var(--affine-text-primary-color)',
            lineHeight: 1.3,
          }}
        >
          {tool.name}
        </div>
        <Tag color={tool.tagColor}>{tool.tag}</Tag>
      </div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--affine-primary-color)',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        {tool.type}
      </div>
      <p
        style={{
          fontSize: 12,
          lineHeight: 1.6,
          color: 'var(--affine-text-secondary-color)',
          margin: 0,
        }}
      >
        {tool.description}
      </p>
    </Card>
  );
}
