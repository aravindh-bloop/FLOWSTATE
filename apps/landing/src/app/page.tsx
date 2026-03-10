'use client';

import { useState } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface FormData {
  full_name: string;
  email: string;
  phone: string;
  discord_user_id: string;
  preferred_start_date: string;
  key_changes: string;
  short_term_goals: string;
  long_term_goals: string;
  goal_motivation: string;
  bottlenecks: string;
  checkin_time_am: string;
  current_wake_time: string;
  peak_mental_time: string;
  wearable_device: string;
}

const INITIAL: FormData = {
  full_name: '',
  email: '',
  phone: '',
  discord_user_id: '',
  preferred_start_date: '',
  key_changes: '',
  short_term_goals: '',
  long_term_goals: '',
  goal_motivation: '',
  bottlenecks: '',
  checkin_time_am: '',
  current_wake_time: '',
  peak_mental_time: '',
  wearable_device: '',
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

// ─── Page ────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [form, setForm] = useState<FormData>(INITIAL);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof FormData, v: string) =>
    setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/registrations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Request failed (${res.status})`);
      }
      setSubmitted(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-[#f1f5f9]">
      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-[#0f172a]/90 backdrop-blur border-b border-[#1e293b]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-[#0fa884] font-bold text-xl tracking-tight">
            FlowState
          </span>
          <a
            href="#register"
            className="bg-[#0fa884] text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-[#0d9670] transition-colors"
          >
            Apply Now
          </a>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="pt-32 pb-24 px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-block bg-[#0fa884]/10 text-[#0fa884] text-xs font-semibold tracking-widest uppercase px-4 py-2 rounded-full mb-8 border border-[#0fa884]/20">
            90-Day Human Performance Coaching
          </div>
          <h1 className="text-5xl md:text-6xl font-bold leading-[1.1] tracking-tight mb-6">
            Reclaim your{' '}
            <span className="text-[#0fa884]">peak cognitive window</span>
          </h1>
          <p className="text-xl text-[#94a3b8] max-w-2xl mx-auto leading-relaxed mb-10">
            A structured 90-day program that rebuilds your chronobiology, shifts
            your focus peak earlier, and installs a sustainable high-performance
            daily routine — tracked daily via Discord.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="#register"
              className="bg-[#0fa884] text-white px-8 py-4 rounded-xl text-base font-semibold hover:bg-[#0d9670] transition-colors shadow-lg shadow-[#0fa884]/20"
            >
              Apply for the Program →
            </a>
            <a
              href="#program"
              className="border border-[#334155] text-[#94a3b8] px-8 py-4 rounded-xl text-base font-semibold hover:border-[#0fa884] hover:text-[#0fa884] transition-colors"
            >
              See the Program
            </a>
          </div>
        </div>
      </section>

      {/* ── Stats bar ───────────────────────────────────────────────────── */}
      <section className="border-y border-[#1e293b] bg-[#0a1220]">
        <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: '90', label: 'Days', sub: 'structured program' },
            { value: '2×', label: 'Daily', sub: 'Discord check-ins' },
            { value: '12', label: 'Weeks', sub: 'progressive protocol' },
            { value: '1:1', label: 'Coach', sub: 'dedicated attention' },
          ].map(stat => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl font-bold text-[#0fa884]">
                {stat.value}
              </div>
              <div className="font-semibold text-[#f1f5f9] mt-1">
                {stat.label}
              </div>
              <div className="text-xs text-[#64748b] mt-0.5">{stat.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── About ───────────────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <SectionLabel>About FlowState</SectionLabel>
          <div className="grid md:grid-cols-2 gap-16 items-center mt-12">
            <div>
              <h2 className="text-4xl font-bold leading-tight mb-6">
                Built for high achievers who want to operate at their best
              </h2>
              <p className="text-[#94a3b8] leading-relaxed mb-6">
                FlowState is a precision coaching program grounded in
                chronobiology and behavioural science. Most people spend their
                sharpest cognitive hours in reactive mode — email, meetings,
                distractions. We fix that.
              </p>
              <p className="text-[#94a3b8] leading-relaxed mb-6">
                Over 90 days you&apos;ll systematically shift your biology:
                earlier wake times, optimised light exposure, structured
                exercise, and a progressively refined schedule that puts deep
                work exactly where your brain is primed for it.
              </p>
              <p className="text-[#94a3b8] leading-relaxed">
                Everything is tracked daily through a private Discord channel.
                Your coach reviews every check-in, responds when you need it,
                and intervenes when the data says you should.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                {
                  icon: '🧠',
                  title: 'Chronobiology-based',
                  desc: 'Targets aligned to your chronotype and MEQ score',
                },
                {
                  icon: '📸',
                  title: 'Daily photo check-ins',
                  desc: 'AI-analysed morning photos with coach feedback',
                },
                {
                  icon: '📊',
                  title: 'Real-time tracking',
                  desc: 'Adherence, HRV, sleep, energy — all in one portal',
                },
                {
                  icon: '🤖',
                  title: 'Smart interventions',
                  desc: 'System flags drops before they become habits',
                },
              ].map(item => (
                <div
                  key={item.title}
                  className="bg-[#1e293b] rounded-xl p-5 border border-[#334155]"
                >
                  <div className="text-2xl mb-3">{item.icon}</div>
                  <div className="font-semibold text-sm mb-1">{item.title}</div>
                  <div className="text-xs text-[#64748b] leading-relaxed">
                    {item.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Program overview ────────────────────────────────────────────── */}
      <section id="program" className="py-24 px-6 bg-[#0a1220]">
        <div className="max-w-6xl mx-auto">
          <SectionLabel>The Program</SectionLabel>
          <h2 className="text-4xl font-bold mt-4 mb-14 text-center">
            Three months. Three phases.
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                month: 'Month 1',
                theme: 'Attention Architecture',
                weeks: 'Weeks 1–4',
                color: '#0fa884',
                items: [
                  'Initial chronotype assessment (MEQ)',
                  'Wake time calibration protocol',
                  'Morning light & exercise anchors',
                  'Caffeine cutoff optimisation',
                  'Week 2 & 4 milestone reviews',
                ],
              },
              {
                month: 'Month 2',
                theme: 'Flow State Engineering',
                weeks: 'Weeks 5–8',
                color: '#f59e0b',
                items: [
                  'Deep work block scheduling',
                  'Flow trigger identification',
                  'Recovery & resilience protocols',
                  'Peak window narrowing',
                  'Week 6 & 8 milestone reviews',
                ],
              },
              {
                month: 'Month 3',
                theme: 'Identity & Integration',
                weeks: 'Weeks 9–12',
                color: '#3b82f6',
                items: [
                  'Identity anchoring practices',
                  'System review & refinement',
                  'Autonomy handoff preparation',
                  'Sustainability testing',
                  'Day 90 final review & debrief',
                ],
              },
            ].map(phase => (
              <div
                key={phase.month}
                className="bg-[#1e293b] rounded-2xl p-7 border border-[#334155] flex flex-col"
              >
                <div
                  className="text-xs font-bold tracking-widest uppercase mb-2"
                  style={{ color: phase.color }}
                >
                  {phase.month}
                </div>
                <h3 className="text-xl font-bold mb-1">{phase.theme}</h3>
                <div className="text-sm text-[#64748b] mb-6">{phase.weeks}</div>
                <ul className="space-y-2.5 mt-auto">
                  {phase.items.map(item => (
                    <li
                      key={item}
                      className="flex items-start gap-2.5 text-sm text-[#94a3b8]"
                    >
                      <span
                        style={{ color: phase.color }}
                        className="mt-0.5 shrink-0"
                      >
                        ✓
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <SectionLabel>How It Works</SectionLabel>
          <h2 className="text-4xl font-bold mt-4 mb-16">
            Three steps to start
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Register',
                desc: 'Fill out the application below. Tell us about your goals, schedule, and what you want to change.',
              },
              {
                step: '02',
                title: 'Get approved',
                desc: "Your coach reviews your application within 48 hours. Once approved, you'll receive your portal login and Discord invite.",
              },
              {
                step: '03',
                title: 'Start your program',
                desc: 'Log in to your personal portal, join Discord, and begin your first morning check-in on your chosen start date.',
              },
            ].map((step, i) => (
              <div key={step.step} className="relative">
                {i < 2 && (
                  <div className="hidden md:block absolute top-8 left-[calc(100%+1px)] w-full h-px bg-gradient-to-r from-[#0fa884]/40 to-transparent" />
                )}
                <div className="bg-[#0fa884]/10 text-[#0fa884] w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold mx-auto mb-5 border border-[#0fa884]/20">
                  {step.step}
                </div>
                <h3 className="text-lg font-bold mb-3">{step.title}</h3>
                <p className="text-[#94a3b8] text-sm leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Registration form ───────────────────────────────────────────── */}
      <section id="register" className="py-24 px-6 bg-[#0a1220]">
        <div className="max-w-2xl mx-auto">
          <SectionLabel center>Apply Now</SectionLabel>
          <h2 className="text-4xl font-bold mt-4 mb-3 text-center">
            Start your 90 days
          </h2>
          <p className="text-[#64748b] text-center mb-10">
            Spots are limited. Your application will be reviewed personally by
            your coach.
          </p>

          {submitted ? (
            /* ── Thank you screen ────────────────────────────────────── */
            <div className="bg-[#1e293b] rounded-2xl p-10 border border-[#334155] text-center">
              <div className="text-5xl mb-5">✅</div>
              <h3 className="text-2xl font-bold mb-4">Application received</h3>
              <p className="text-[#94a3b8] leading-relaxed">
                Thank you for your interest in FlowState. We&apos;ve received
                your registration and will review it shortly. You&apos;ll hear
                from us via email once your spot is confirmed.
              </p>
            </div>
          ) : (
            /* ── Form ──────────────────────────────────────────────── */
            <form
              onSubmit={handleSubmit}
              className="bg-[#1e293b] rounded-2xl p-8 border border-[#334155] space-y-6"
            >
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 text-sm">
                  {error}
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-5">
                <Field label="Name" required>
                  <input
                    type="text"
                    required
                    value={form.full_name}
                    onChange={e => set('full_name', e.target.value)}
                    placeholder="Jane Smith"
                    className={inputClass}
                  />
                </Field>
                <Field label="Gmail" required>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={e => set('email', e.target.value)}
                    placeholder="jane@gmail.com"
                    className={inputClass}
                  />
                </Field>
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                <Field label="Phone">
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={e => set('phone', e.target.value)}
                    placeholder="+1 555 000 0000"
                    className={inputClass}
                  />
                </Field>
                <Field
                  label="Discord ID"
                  required
                  hint="Your Discord username e.g. johndoe#1234 or johndoe"
                >
                  <input
                    type="text"
                    required
                    value={form.discord_user_id}
                    onChange={e => set('discord_user_id', e.target.value)}
                    placeholder="johndoe"
                    className={inputClass}
                  />
                </Field>
              </div>

              <Field
                label="Preferred Start Date"
                required
                hint="We will do our best to accommodate this, though it is subject to final approval."
              >
                <input
                  type="date"
                  required
                  value={form.preferred_start_date}
                  onChange={e => set('preferred_start_date', e.target.value)}
                  className={inputClass}
                />
              </Field>

              <Field label="Any key things you'd like to see change?">
                <textarea
                  value={form.key_changes}
                  onChange={e => set('key_changes', e.target.value)}
                  rows={3}
                  placeholder="e.g. I want to stop feeling scattered in the mornings..."
                  className={`${inputClass} resize-none`}
                />
              </Field>

              <Field label="What are you looking forward to learning or accomplishing in your first few days/weeks?">
                <textarea
                  value={form.short_term_goals}
                  onChange={e => set('short_term_goals', e.target.value)}
                  rows={3}
                  placeholder="e.g. Build a consistent morning routine..."
                  className={`${inputClass} resize-none`}
                />
              </Field>

              <Field label="Goals you hope to achieve in the long run">
                <textarea
                  value={form.long_term_goals}
                  onChange={e => set('long_term_goals', e.target.value)}
                  rows={3}
                  placeholder="e.g. Finish my thesis, launch my product, get promoted..."
                  className={`${inputClass} resize-none`}
                />
              </Field>

              <Field label="Why are these goals important to you right now?">
                <textarea
                  value={form.goal_motivation}
                  onChange={e => set('goal_motivation', e.target.value)}
                  rows={3}
                  placeholder="e.g. I have a major deadline in 3 months..."
                  className={`${inputClass} resize-none`}
                />
              </Field>

              <Field label="What are the main bottlenecks or things holding you back from becoming the best version of yourself?">
                <textarea
                  value={form.bottlenecks}
                  onChange={e => set('bottlenecks', e.target.value)}
                  rows={3}
                  placeholder="e.g. Late nights, phone addiction, inconsistent sleep..."
                  className={`${inputClass} resize-none`}
                />
              </Field>

              <div className="grid sm:grid-cols-2 gap-5">
                <Field label="Preferred Morning Check-in Time" required>
                  <input
                    type="time"
                    required
                    value={form.checkin_time_am}
                    onChange={e => set('checkin_time_am', e.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field label="Current typical wake time">
                  <input
                    type="time"
                    value={form.current_wake_time}
                    onChange={e => set('current_wake_time', e.target.value)}
                    className={inputClass}
                  />
                </Field>
              </div>

              <Field label="When do you feel most mentally sharp?">
                <input
                  type="text"
                  value={form.peak_mental_time}
                  onChange={e => set('peak_mental_time', e.target.value)}
                  placeholder="e.g. Late morning, around 10am"
                  className={inputClass}
                />
              </Field>

              <Field
                label="Are you a wearable user? (Apple Watch, Whoop, Oura, etc.)"
                hint="Answer N/A if you do not use any"
              >
                <input
                  type="text"
                  value={form.wearable_device}
                  onChange={e => set('wearable_device', e.target.value)}
                  placeholder="e.g. Whoop 4.0, or N/A"
                  className={inputClass}
                />
              </Field>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#0fa884] hover:bg-[#0d9670] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl transition-colors text-base mt-2"
              >
                {submitting ? 'Submitting…' : 'Submit →'}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-[#1e293b] py-8 px-6 text-center text-sm text-[#475569]">
        <span className="text-[#0fa884] font-bold">FlowState</span> — 90-Day
        Human Performance Coaching
      </footer>
    </div>
  );
}

// ─── Shared components ────────────────────────────────────────────────────────

function SectionLabel({
  children,
  center,
}: {
  children: React.ReactNode;
  center?: boolean;
}) {
  return (
    <div className={`flex ${center ? 'justify-center' : 'justify-start'}`}>
      <span className="inline-block text-[#0fa884] text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full border border-[#0fa884]/20 bg-[#0fa884]/5">
        {children}
      </span>
    </div>
  );
}

function Field({
  label,
  children,
  required,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748b] mb-1.5">
        {label}
        {required && <span className="text-[#0fa884] ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-[#475569]">{hint}</p>}
    </div>
  );
}

const inputClass =
  'w-full bg-[#0f172a] border border-[#334155] text-[#f1f5f9] rounded-lg px-4 py-3 text-sm placeholder:text-[#475569] focus:outline-none focus:border-[#0fa884] focus:ring-1 focus:ring-[#0fa884] transition-colors';
