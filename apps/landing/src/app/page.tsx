'use client';

import { useState, useRef, useEffect } from 'react';
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  AnimatePresence,
  useInView,
} from 'framer-motion';
import {
  Brain,
  Camera,
  Bot,
  CheckCircle2,
  ArrowRight,
  ArrowUpRight,
  Zap,
  Menu,
  X,
  Clock,
  Layout,
  User,
  Activity,
  ChevronDown,
  Sparkles,
  Shield,
  Target,
  Eye,
} from 'lucide-react';

/* ─── Types ──────────────────────────────────────────────────────── */

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
  full_name: '', email: '', phone: '', discord_user_id: '',
  preferred_start_date: '', key_changes: '', short_term_goals: '',
  long_term_goals: '', goal_motivation: '', bottlenecks: '',
  checkin_time_am: '', current_wake_time: '', peak_mental_time: '',
  wearable_device: '',
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

/* ─── Seeded random (fixes hydration mismatch) ───────────────────── */

function seededRandom(seed: number) {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

/* ─── Bubble Background (brighter + bigger) ──────────────────────── */

function BubbleBackground() {
  return (
    <div className="bubbles-container">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="bubble">
          <span /><span /><span /><span /><span />
        </div>
      ))}
    </div>
  );
}

/* ─── Particles (seeded — no hydration mismatch) ─────────────────── */

function Particles({ count = 18 }: { count?: number }) {
  const particles = Array.from({ length: count }, (_, i) => ({
    id: i,
    left: `${(seededRandom(i * 7 + 1) * 100).toFixed(2)}%`,
    size: +(seededRandom(i * 13 + 2) * 2 + 1).toFixed(2),
    duration: +(seededRandom(i * 19 + 3) * 18 + 12).toFixed(2),
    delay: +(seededRandom(i * 23 + 4) * 12).toFixed(2),
  }));

  return (
    <div className="particle-field">
      {particles.map(p => (
        <div
          key={p.id}
          className="particle"
          style={{
            left: p.left,
            bottom: '-10px',
            width: `${p.size}px`,
            height: `${p.size}px`,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

/* ─── Animated Brand Name ────────────────────────────────────────── */

function AnimatedBrandName() {
  const letters = 'FLOWSTATE'.split('');
  return (
    <h1
      className="heading-display brand-glow"
      style={{
        fontSize: 'clamp(4rem, 15vw, 11rem)',
        fontFamily: 'var(--font-display)',
        perspective: '1000px',
        lineHeight: 0.85,
      }}
    >
      {letters.map((letter, i) => (
        <span
          key={i}
          className="brand-letter text-gradient-accent"
          style={{ animationDelay: `${0.3 + i * 0.07}s` }}
        >
          {letter}
        </span>
      ))}
    </h1>
  );
}

/* ─── Fancy Button (UIverse) ─────────────────────────────────────── */

function FancyButton({
  children, href, type, disabled, className = '', fullWidth,
}: {
  children: React.ReactNode; href?: string; type?: 'submit' | 'button';
  disabled?: boolean; className?: string; fullWidth?: boolean;
}) {
  const style: React.CSSProperties = fullWidth ? { width: '100%' } : {};
  if (href) {
    return (
      <a href={href} className={`fancy-btn ${className}`} style={style}>
        <span className="btn-inner">{children}</span>
      </a>
    );
  }
  return (
    <button type={type} disabled={disabled} className={`fancy-btn ${className}`} style={{ ...style, opacity: disabled ? 0.6 : 1 }}>
      <span className="btn-inner">{children}</span>
    </button>
  );
}

function GhostButton({ children, href }: { children: React.ReactNode; href?: string }) {
  return <a href={href} className="fancy-btn-ghost">{children}</a>;
}

/* ─── Section Label ──────────────────────────────────────────────── */

function SectionLabel({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      style={{ display: 'flex', justifyContent: center ? 'center' : 'flex-start' }}
    >
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '8px 16px', borderRadius: 100,
        border: '1px solid rgba(168, 180, 255, 0.15)',
        background: 'rgba(168, 180, 255, 0.04)',
        fontSize: 10, fontWeight: 700, letterSpacing: '0.25em',
        textTransform: 'uppercase', color: 'var(--accent)',
        fontFamily: 'var(--font-display)',
      }}>
        <Sparkles style={{ width: 12, height: 12 }} />
        {children}
      </span>
    </motion.div>
  );
}

/* ─── Animated Counter ───────────────────────────────────────────── */

function AnimatedCounter({ value, suffix = '' }: { value: string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const num = parseInt(value);

  useEffect(() => {
    if (!inView || !ref.current || isNaN(num)) return;
    let cur = 0;
    const step = Math.max(1, Math.floor(2000 / num));
    const timer = setInterval(() => {
      cur += 1;
      if (ref.current) ref.current.textContent = `${cur}${suffix}`;
      if (cur >= num) clearInterval(timer);
    }, step);
    return () => clearInterval(timer);
  }, [inView, num, suffix]);

  return <span ref={ref} className="stat-number">{isNaN(num) ? value : `0${suffix}`}</span>;
}

/* ─── M2-Style Feature Card (glowing borders) ────────────────────── */

function M2FeatureCard({
  icon: Icon, title, desc, index,
}: {
  icon: React.ElementType; title: string; desc: string; index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -6, transition: { duration: 0.3 } }}
      className="m2-card-sm group cursor-default"
      style={{ padding: '36px 28px' }}
    >
      <div style={{
        width: 46, height: 46, borderRadius: 14,
        background: 'rgba(168, 180, 255, 0.06)',
        border: '1px solid rgba(168, 180, 255, 0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 18, transition: 'transform 0.4s',
      }} className="group-hover:scale-110">
        <Icon style={{ width: 20, height: 20, color: 'var(--accent)' }} />
      </div>
      <h3 style={{
        fontFamily: 'var(--font-display)', fontWeight: 700,
        fontSize: 17, color: 'var(--text-primary)', letterSpacing: '-0.02em',
        marginBottom: 8,
      }}>
        {title}
      </h3>
      <p style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--text-secondary)' }}>{desc}</p>
    </motion.div>
  );
}

/* ─── Scroll Progress ────────────────────────────────────────────── */

function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });
  return (
    <motion.div style={{
      scaleX, transformOrigin: '0%',
      position: 'fixed', top: 0, left: 0, right: 0,
      height: 2,
      background: 'linear-gradient(90deg, #5b5ef0, #7ecde8, #c4a0ff)',
      zIndex: 100,
    }} />
  );
}

/* ─── Field ──────────────────────────────────────────────────────── */

function Field({ label, children, required, hint }: {
  label: string; children: React.ReactNode; required?: boolean; hint?: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{
        fontSize: 10, fontWeight: 700, letterSpacing: '0.2em',
        textTransform: 'uppercase', color: 'var(--text-muted)',
        fontFamily: 'var(--font-display)',
      }}>
        {label}
        {required && <span style={{ color: 'var(--accent)', marginLeft: 4 }}>*</span>}
      </label>
      {children}
      {hint && <p style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>{hint}</p>}
    </div>
  );
}

/* ─── Marquee ────────────────────────────────────────────────────── */

function MarqueeBand() {
  const words = [
    'CHRONOBIOLOGY', 'DEEP WORK', 'BIOMETRICS', 'PEAK COGNITION',
    'FLOW STATE', 'HRV OPTIMIZATION', 'NEURAL READINESS', 'CIRCADIAN SYNC',
  ];
  return (
    <div style={{ overflow: 'hidden', padding: '24px 0', borderTop: '1px solid rgba(168,180,255,0.1)', borderBottom: '1px solid rgba(168,180,255,0.1)' }}>
      <div className="marquee-track">
        {[...words, ...words].map((w, i) => (
          <span key={i} style={{
            display: 'flex', alignItems: 'center', gap: 16, whiteSpace: 'nowrap',
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14,
            letterSpacing: '0.12em',
            color: i % 2 === 0 ? 'var(--text-secondary)' : 'var(--accent)',
            opacity: i % 2 === 0 ? 0.4 : 0.65,
          }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)', opacity: 0.5, boxShadow: '0 0 6px rgba(168,180,255,0.3)' }} />
            {w}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════════ */

export default function LandingPage() {
  const [form, setForm] = useState<FormData>(INITIAL);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [navScrolled, setNavScrolled] = useState(false);

  const heroRef = useRef(null);
  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  const heroY = useTransform(heroProgress, [0, 1], [0, 150]);
  const heroOpacity = useTransform(heroProgress, [0, 0.6], [1, 0]);
  const heroScale = useTransform(heroProgress, [0, 0.6], [1, 0.96]);

  useEffect(() => {
    const h = () => setNavScrolled(window.scrollY > 50);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  const set = (k: keyof FormData, v: string) => setForm(f => ({ ...f, [k]: v }));

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
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  const navItems = ['About', 'Protocol', 'Process'];

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      <ScrollProgress />
      <div className="ambient-glow" />
      <div className="grid-overlay" />
      <div className="noise-overlay" />
      <div className="orb orb-accent" style={{ width: 500, height: 500, top: -100, left: -200 }} />
      <div className="orb orb-blue" style={{ width: 400, height: 400, top: '30%', right: -150 }} />
      <div className="orb orb-purple" style={{ width: 300, height: 300, bottom: '20%', left: '10%' }} />

      {/* ── Nav ────────────────────────────────────────────────────── */}
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className={navScrolled ? 'glass-strong' : ''}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
          height: 72,
          borderBottom: navScrolled ? '1px solid rgba(168,180,255,0.06)' : '1px solid transparent',
          transition: 'all 0.4s ease',
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <a href="#" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg, #5b5ef0, #7c80ff)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 18px rgba(91, 94, 240, 0.3)',
            }}>
              <Zap style={{ width: 18, height: 18, color: '#fff' }} strokeWidth={3} />
            </div>
            <span style={{
              fontFamily: 'var(--font-display)', fontWeight: 800,
              fontSize: 20, letterSpacing: '-0.04em', color: 'var(--text-primary)',
            }}>
              FLOWSTATE
            </span>
          </a>

          <div className="hidden md:flex" style={{ alignItems: 'center', gap: 40 }}>
            {navItems.map(item => (
              <a key={item} href={`#${item.toLowerCase()}`} style={{
                fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 600,
                letterSpacing: '0.15em', textTransform: 'uppercase',
                color: 'var(--text-secondary)', textDecoration: 'none', transition: 'color 0.3s',
              }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
              >{item}</a>
            ))}
            <FancyButton href="#register">
              Apply Now <ArrowUpRight style={{ width: 14, height: 14 }} />
            </FancyButton>
          </div>

          <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{ color: 'var(--text-primary)', background: 'none', border: 'none', cursor: 'pointer' }}>
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </motion.nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="md:hidden" style={{
              position: 'fixed', inset: 0, zIndex: 40,
              background: 'rgba(6,6,9,0.97)', backdropFilter: 'blur(40px)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 32,
            }}>
            {[...navItems, 'Apply'].map((item, i) => (
              <motion.a key={item}
                href={item === 'Apply' ? '#register' : `#${item.toLowerCase()}`}
                onClick={() => setMobileMenuOpen(false)}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                style={{
                  fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800,
                  letterSpacing: '-0.04em', textDecoration: 'none',
                  color: item === 'Apply' ? 'var(--accent)' : 'var(--text-primary)',
                }}>{item}</motion.a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section ref={heroRef} style={{
        position: 'relative', zIndex: 10, minHeight: '100vh',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        paddingTop: 100, paddingBottom: 120, overflow: 'hidden',
      }}>
        <BubbleBackground />
        <Particles count={18} />
        <div className="scanline" />

        <motion.div style={{
          y: heroY, opacity: heroOpacity, scale: heroScale,
          width: '100%', maxWidth: 1100, margin: '0 auto', padding: '0 24px', textAlign: 'center',
        }}>
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            transition={{ duration: 1, delay: 0.1 }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              padding: '8px 20px', borderRadius: 100,
              border: '1px solid rgba(168,180,255,0.1)',
              background: 'rgba(168,180,255,0.03)', marginBottom: 40,
            }}>
            <span className="animate-pulse" style={{
              width: 6, height: 6, borderRadius: '50%',
              background: 'var(--accent)', boxShadow: '0 0 10px var(--accent)',
            }} />
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.2em',
              textTransform: 'uppercase', color: 'var(--text-secondary)',
              fontFamily: 'var(--font-display)',
            }}>Now Accepting Q2 Applications</span>
          </motion.div>

          {/* M2-style Brand Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="m2-card"
            style={{ padding: '52px 24px', width: '100%', maxWidth: 1100, marginBottom: 16 }}
          >
            <AnimatedBrandName />
          </motion.div>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(15px, 2.2vw, 19px)', fontWeight: 400,
              lineHeight: 1.7, color: 'var(--text-secondary)',
              maxWidth: 560, margin: '32px auto 0',
            }}>
            Precision chronobiology coaching for high-stakes performance.
            <br />
            <span style={{ color: 'var(--accent)', opacity: 0.6 }}>
              90 days to reclaim your peak cognitive window.
            </span>
          </motion.p>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.4, duration: 0.8 }}
            style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center', alignItems: 'center', marginTop: 44 }}>
            <FancyButton href="#register">
              Start Your Protocol <ArrowRight style={{ width: 16, height: 16 }} />
            </FancyButton>
            <GhostButton href="#protocol">
              Explore the System <ChevronDown style={{ width: 16, height: 16 }} />
            </GhostButton>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.5 }}
          style={{ position: 'absolute', bottom: 40, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-display)' }}>Scroll</span>
          <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 2, repeat: Infinity }}
            style={{ width: 22, height: 36, borderRadius: 11, border: '1px solid rgba(168,180,255,0.1)', display: 'flex', justifyContent: 'center', paddingTop: 8 }}>
            <motion.div animate={{ opacity: [0.2, 0.8, 0.2], y: [0, 10, 0] }} transition={{ duration: 2, repeat: Infinity }}
              style={{ width: 2, height: 8, borderRadius: 2, background: 'var(--accent)' }} />
          </motion.div>
        </motion.div>
      </section>

      {/* Spacer + Spotlit Marquee */}
      <div style={{ height: 40 }} />
      <div style={{ position: 'relative' }}>
        {/* Spotlight glow behind the marquee */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: '60%', height: 120, borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(91,94,240,0.12) 0%, rgba(168,180,255,0.06) 40%, transparent 70%)',
          filter: 'blur(30px)', pointerEvents: 'none',
        }} />
        <MarqueeBand />
      </div>

      {/* ── Stats ─────────────────────────────────────────────────── */}
      <section style={{ position: 'relative', zIndex: 10, padding: '80px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { value: '90', suffix: '', label: 'Day Protocol', icon: Clock },
              { value: '2', suffix: '×', label: 'Daily Anchors', icon: Target },
              { value: '12', suffix: '', label: 'Week Cycles', icon: Activity },
              { value: '1:1', suffix: '', label: 'Private Coaching', icon: Shield },
            ].map((stat, i) => (
              <motion.div key={stat.label}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.6 }}
                style={{
                  textAlign: 'center', padding: '32px 16px', borderRadius: 20,
                  background: 'rgba(168, 180, 255, 0.015)',
                  border: '1px solid rgba(168, 180, 255, 0.06)',
                }}>
                <stat.icon style={{ width: 18, height: 18, margin: '0 auto 12px', color: 'var(--accent)', opacity: 0.6 }} />
                <div style={{
                  fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 4.5vw, 3rem)',
                  fontWeight: 800, letterSpacing: '-0.06em', color: 'var(--text-primary)', marginBottom: 6,
                }}>
                  {stat.value === '1:1' ? '1:1' : <AnimatedCounter value={stat.value} suffix={stat.suffix} />}
                </div>
                <div style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.25em',
                  textTransform: 'uppercase', color: 'var(--accent)', opacity: 0.5,
                  fontFamily: 'var(--font-display)',
                }}>
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <div className="section-divider" style={{ maxWidth: 1100, margin: '0 auto' }} />

      {/* ── About ─────────────────────────────────────────────────── */}
      <section id="about" style={{ position: 'relative', zIndex: 10, padding: '120px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <SectionLabel>Biological Engineering</SectionLabel>

          <div className="grid lg:grid-cols-2 gap-16 lg:gap-20" style={{ alignItems: 'center', marginTop: 48 }}>
            <motion.div
              initial={{ opacity: 0, x: -25 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}>
              <h2 className="heading-section"
                style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 4.5vw, 3.2rem)', marginBottom: 32 }}>
                Operating in deep focus <br />
                <span className="text-gradient-accent">shouldn&apos;t be an accident.</span>
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 20, fontSize: 15, lineHeight: 1.8, color: 'var(--text-secondary)' }}>
                <p>FlowState is not a self-help course. It is a precise intervention grounded in <span style={{ color: 'var(--accent)', fontWeight: 600 }}>chronobiology</span> and extreme ownership.</p>
                <p>Most high-performers are biological orphans — operating out of sync with their natural oscillators. We rebuild your foundation from the <span style={{ color: 'var(--accent-cool)', fontWeight: 600 }}>cellular level</span> up.</p>
              </div>

              <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  'Dynamic MEQ-aligned wake protocols',
                  'Light-anchored cognitive peak shifts',
                  'Biometric-backed intervention loops',
                ].map((item, i) => (
                  <motion.div key={item}
                    initial={{ opacity: 0, x: -15 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 + i * 0.08 }}
                    style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: '50%',
                      background: 'rgba(168,180,255,0.06)',
                      border: '1px solid rgba(168,180,255,0.12)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <CheckCircle2 style={{ width: 13, height: 13, color: 'var(--accent)' }} />
                    </div>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{item}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Feature cards with M2 glowing style */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Brain, title: 'Cognitive Peaks', desc: 'Synchronize deep work with your brain\'s natural neural readiness windows.' },
                { icon: Camera, title: 'Visual Anchors', desc: 'Photo-verified morning light to calibrate your circadian clock precisely.' },
                { icon: Activity, title: 'Biometric Feedback', desc: 'HRV and sleep-driven protocol adjustments delivered in real-time.' },
                { icon: Bot, title: 'AI + Human Coaching', desc: 'Intelligent automation paired with experienced human oversight & depth.' },
              ].map((item, i) => (
                <M2FeatureCard key={item.title} icon={item.icon} title={item.title} desc={item.desc} index={i} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Protocol ──────────────────────────────────────────────── */}
      <section id="protocol" style={{ position: 'relative', zIndex: 10, padding: '120px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <SectionLabel center>The Architecture</SectionLabel>

          <motion.h2 initial={{ opacity: 0, y: 25 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="heading-section"
            style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 5vw, 4rem)', textAlign: 'center', marginTop: 28, marginBottom: 16 }}>
            The 90-Day <span className="text-gradient-accent">Transformation.</span>
          </motion.h2>

          <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            style={{ textAlign: 'center', maxWidth: 560, margin: '0 auto 64px', color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.7 }}>
            Three precision-engineered phases that systematically rebuild your biological operating system.
          </motion.p>

          <div className="grid lg:grid-cols-3 gap-5">
            {[
              { step: '01', title: 'Architecture', weeks: 'Weeks 1–4', accentColor: '#818cf8',
                items: ['Metabolic & Light Calibration', 'Chronotype MEQ Assessment', 'The First 20 Anchor Point', 'Digital Environment Audit'], icon: Layout },
              { step: '02', title: 'Engineering', weeks: 'Weeks 5–8', accentColor: '#7ecde8',
                items: ['Deep Work Block Scheduling', 'Neuro-Nutrient Framework', 'Recovery Window Optimisation', 'Cognitive Peak Narrowing'], icon: Activity },
              { step: '03', title: 'Mastery', weeks: 'Weeks 9–12', accentColor: '#c4a0ff',
                items: ['Identity Anchor Reinforcement', 'System Autonomy Handoff', 'Long-Tail Sustainability', 'The Day 90 Debriefing'], icon: User },
            ].map((phase, i) => (
              <motion.div key={phase.title}
                initial={{ opacity: 0, y: 35 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12, duration: 0.7 }}
                className="m2-card-sm group"
                style={{ padding: '44px 32px' }}>
                {/* Watermark */}
                <div style={{
                  position: 'absolute', top: -8, right: 0,
                  fontFamily: 'var(--font-display)', fontSize: 140, fontWeight: 900,
                  color: 'var(--text-primary)', opacity: 0.02, lineHeight: 1,
                  transition: 'opacity 0.4s',
                }} className="group-hover:!opacity-[0.05]">{phase.step}</div>

                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 16,
                    background: `${phase.accentColor}12`,
                    border: `1px solid ${phase.accentColor}22`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: 28, transition: 'transform 0.3s',
                  }} className="group-hover:scale-110">
                    <phase.icon style={{ width: 22, height: 22, color: phase.accentColor }} />
                  </div>

                  <div style={{
                    fontSize: 10, fontWeight: 800, letterSpacing: '0.35em',
                    textTransform: 'uppercase', color: phase.accentColor, opacity: 0.6,
                    fontFamily: 'var(--font-display)', marginBottom: 8,
                  }}>{phase.weeks}</div>

                  <h3 style={{
                    fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800,
                    letterSpacing: '-0.04em', color: 'var(--text-primary)',
                    textTransform: 'uppercase', marginBottom: 28,
                  }}>{phase.title}</h3>

                  <ul style={{ display: 'flex', flexDirection: 'column' }}>
                    {phase.items.map(item => (
                      <li key={item} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        paddingTop: 14, borderTop: '1px solid rgba(168,180,255,0.06)',
                        fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)',
                      }}>
                        <span style={{ width: 4, height: 4, borderRadius: '50%', background: phase.accentColor, flexShrink: 0 }} />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <div className="section-divider" style={{ maxWidth: 1100, margin: '0 auto' }} />

      {/* ── Process ───────────────────────────────────────────────── */}
      <section id="process" style={{ position: 'relative', zIndex: 10, padding: '120px 24px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <SectionLabel center>The Onboarding</SectionLabel>

          <motion.h2 initial={{ opacity: 0, y: 25 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="heading-section"
            style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 4.5vw, 3.2rem)', textAlign: 'center', marginTop: 28, marginBottom: 64 }}>
            Your path to <span className="text-gradient-accent">elite performance.</span>
          </motion.h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {[
              { title: 'Protocol Registration', desc: 'Complete the intake form. We analyze your biological constraints, sleep patterns, and performance goals.', icon: Eye },
              { title: 'Personalised Strategy', desc: 'MEQ chronotype analysis and a 1:1 strategy session with your designated lead coach.', icon: Brain },
              { title: 'Live Execution', desc: 'Morning 1 on Day 1. Total accountability via the private Discord protocol environment.', icon: Zap },
            ].map((step, i) => (
              <motion.div key={step.title}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12, duration: 0.6 }}
                style={{ display: 'flex', alignItems: 'flex-start', gap: 24 }} className="group">
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, paddingTop: 4 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    border: '2px solid rgba(168,180,255,0.25)',
                    background: 'var(--bg)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 0 24px rgba(168,180,255,0.1)',
                  }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, color: 'var(--accent)' }}>{`0${i + 1}`}</span>
                  </div>
                  {i < 2 && <div style={{ width: 1, height: 50, background: 'linear-gradient(180deg, rgba(168,180,255,0.15) 0%, transparent 100%)', marginTop: 6 }} />}
                </div>

                <motion.div whileHover={{ x: 6 }} transition={{ duration: 0.3 }}
                  className="m2-card-sm"
                  style={{ flex: 1, padding: '28px', cursor: 'default' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <step.icon style={{ width: 15, height: 15, color: 'var(--accent)', opacity: 0.7 }} />
                    <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>{step.title}</h3>
                  </div>
                  <p style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--text-secondary)' }}>{step.desc}</p>
                </motion.div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonial ───────────────────────────────────────────── */}
      <section style={{ padding: '80px 24px', position: 'relative', zIndex: 10 }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="m2-card"
            style={{ padding: '56px 48px', textAlign: 'center', flexDirection: 'column' }}>
            <div style={{ fontSize: 60, lineHeight: 1, color: 'var(--accent)', opacity: 0.2, fontFamily: 'Georgia, serif', marginBottom: 16 }}>&ldquo;</div>
            <p style={{
              fontFamily: 'var(--font-display)', fontSize: 'clamp(17px, 2.5vw, 23px)',
              fontWeight: 500, lineHeight: 1.6, color: 'var(--text-primary)',
              maxWidth: 600, margin: '0 auto', letterSpacing: '-0.02em',
            }}>
              The protocol didn&apos;t just change my mornings — it restructured how I think about cognitive output.
              I went from scattered to <span style={{ color: 'var(--accent)' }}>surgically focused</span> in 30 days.
            </p>
            <div style={{ marginTop: 32 }}>
              <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: 'var(--accent-warm)', letterSpacing: '-0.02em' }}>Early Beta Participant</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Founder & CEO — Series B Startup</p>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="section-divider" style={{ maxWidth: 1100, margin: '0 auto' }} />

      {/* ── Registration ──────────────────────────────────────────── */}
      <section id="register" style={{ position: 'relative', zIndex: 10, padding: '120px 24px' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <SectionLabel center>The Intake</SectionLabel>
            <motion.h2 initial={{ opacity: 0, y: 25 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="heading-section"
              style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 5vw, 4rem)', marginTop: 28, marginBottom: 12 }}>
              Apply <span className="text-gradient-accent">Now.</span>
            </motion.h2>
            <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
              style={{ color: 'var(--text-secondary)', fontSize: 15 }}>
              Limited cohort capacity. Elite performance standards only.
            </motion.p>
          </div>

          <AnimatePresence mode="wait">
            {submitted ? (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="m2-card" style={{ textAlign: 'center', padding: '56px 40px', flexDirection: 'column' }}>
                <div style={{
                  width: 64, height: 64, borderRadius: '50%',
                  background: 'rgba(168,180,255,0.06)', border: '1px solid rgba(168,180,255,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px',
                }}>
                  <CheckCircle2 style={{ width: 28, height: 28, color: 'var(--accent)' }} />
                </div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, letterSpacing: '-0.04em', color: 'var(--text-primary)', marginBottom: 12 }}>
                  Application Received.
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.7, maxWidth: 380, margin: '0 auto' }}>
                  Your lead coach will review your biology within 48 hours.
                </p>
                <button onClick={() => setSubmitted(false)} style={{
                  marginTop: 32, fontFamily: 'var(--font-display)', fontWeight: 700,
                  fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase',
                  color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer',
                }}>Edit Application</button>
              </motion.div>
            ) : (
              <motion.form key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                onSubmit={handleSubmit}
                style={{
                  padding: '40px 36px', borderRadius: 24,
                  background: 'var(--surface)',
                  border: '1px solid rgba(168,180,255,0.06)',
                  display: 'flex', flexDirection: 'column', gap: 28,
                }}>
                {error && (
                  <div style={{ borderRadius: 14, padding: '14px 20px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: '#f87171', fontSize: 13, fontWeight: 600 }}>{error}</div>
                )}

                <div className="grid sm:grid-cols-2 gap-6">
                  <Field label="Identity / Name" required>
                    <input type="text" required value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="e.g. Sterling Archer" className="input-field" />
                  </Field>
                  <Field label="Communication / Email" required>
                    <input type="email" required value={form.email} onChange={e => set('email', e.target.value)} placeholder="name@domain.com" className="input-field" />
                  </Field>
                </div>

                <div className="grid sm:grid-cols-2 gap-6">
                  <Field label="Mobile / WhatsApp">
                    <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+1 (000) 000-0000" className="input-field" />
                  </Field>
                  <Field label="Secure / Discord ID" required hint="Crucial for daily anchors.">
                    <input type="text" required value={form.discord_user_id} onChange={e => set('discord_user_id', e.target.value)} placeholder="username" className="input-field" />
                  </Field>
                </div>

                <Field label="Requested Activation Date" required>
                  <input type="date" required value={form.preferred_start_date} onChange={e => set('preferred_start_date', e.target.value)} className="input-field" />
                </Field>

                <Field label="Primary Biological Constraints">
                  <textarea value={form.bottlenecks} onChange={e => set('bottlenecks', e.target.value)} rows={3} placeholder="What is currently limiting your output?" className="input-field" style={{ resize: 'none' }} />
                </Field>

                <Field label="First Quarter Goals">
                  <textarea value={form.long_term_goals} onChange={e => set('long_term_goals', e.target.value)} rows={3} placeholder="Where do you expect to be in 90 days?" className="input-field" style={{ resize: 'none' }} />
                </Field>

                <div className="grid sm:grid-cols-2 gap-6">
                  <Field label="Target Wake Anchor" required>
                    <input type="time" required value={form.checkin_time_am} onChange={e => set('checkin_time_am', e.target.value)} className="input-field" />
                  </Field>
                  <Field label="Wearable Ecosystem">
                    <input type="text" value={form.wearable_device} onChange={e => set('wearable_device', e.target.value)} placeholder="Whoop, Oura, Apple, etc." className="input-field" />
                  </Field>
                </div>

                <FancyButton type="submit" disabled={submitting} fullWidth>
                  {submitting ? 'Submitting Application…' : 'Finalise Protocol Intake'}
                </FancyButton>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <footer style={{ position: 'relative', zIndex: 10, padding: '64px 24px', borderTop: '1px solid rgba(168,180,255,0.06)', background: 'var(--bg)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 32 }}>
            <a href="#" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: 'linear-gradient(135deg, #5b5ef0, #7c80ff)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Zap style={{ width: 14, height: 14, color: '#fff' }} strokeWidth={3} />
              </div>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, letterSpacing: '-0.04em', color: 'var(--text-primary)' }}>FLOWSTATE</span>
            </a>
            <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.25em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-display)' }}>
              © 2025 Biological Performance Systems
            </p>
            <div style={{ display: 'flex', gap: 24 }}>
              {['Privacy', 'Terms'].map(item => (
                <a key={item} href="#" style={{ fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none', transition: 'color 0.3s', fontWeight: 500 }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>{item}</a>
              ))}
            </div>
          </div>

          {/* Giant watermark */}
          <div style={{ marginTop: 48, textAlign: 'center', overflow: 'hidden' }}>
            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 0.02 }} viewport={{ once: true }}
              style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(60px, 14vw, 180px)', fontWeight: 900, letterSpacing: '-0.06em', color: 'var(--text-primary)', lineHeight: 1, userSelect: 'none' }}>
              FLOWSTATE
            </motion.div>
          </div>
        </div>
      </footer>
    </div>
  );
}
