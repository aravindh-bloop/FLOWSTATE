'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../../lib/api';
import { AuthLayout } from '../../../components/layout';
import {
  cs,
  statusStyle,
  adherenceColor,
  inp,
  btn,
  glassCard
} from '../../../lib/styles';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  Clock, 
  Activity, 
  Zap, 
  Moon, 
  Target, 
  User, 
  Plus, 
  Send,
  MessageSquare,
  Sparkles,
  BarChart3,
  Sun,
  Coffee,
  Brain,
  X,
  ChevronRight
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────

type Tab = 'overview' | 'checkins' | 'interventions';

interface Client {
  id: string;
  full_name: string;
  email: string;
  status: string;
  program_week: number;
  program_day: number;
  rolling_7d_adherence: number;
  streak_count: number;
  consecutive_missed_checkins: number;
  last_checkin_at: string | null;
  chronotype: string | null;
  target_wake_time: string;
  target_bedtime: string;
  target_caffeine_cutoff: string;
  morning_light_duration_min: number;
  morning_exercise_time: string;
  target_peak_window: string;
  program_start_date: string;
  program_end_date: string;
  primary_goal: string | null;
  meq_score: number | null;
  checkin_time_am: string;
  checkin_time_pm: string;
}

interface Checkin {
  id: string;
  type: string;
  submitted_at: string;
  adherence_score: number | null;
  energy_rating: number | null;
  focus_rating: number | null;
  sleep_hours: number | null;
  ai_analysis: string | null;
}

interface Intervention {
  id: string;
  status: string;
  created_at: string;
  final_message: string | null;
  draft_message: string | null;
  trigger_condition: string;
}

interface CheckinStats {
  avg_adherence: number;
  avg_energy: number;
  avg_sleep: number;
  total_checkins: number;
}

// ── Constants ──────────────────────────────────────────────────────

const TABS: { key: Tab; label: string; icon: any }[] = [
  { key: 'overview', label: 'Overview', icon: User },
  { key: 'checkins', label: 'Activity Logs', icon: BarChart3 },
  { key: 'interventions', label: 'Correction Protocols', icon: MessageSquare },
];

// ── Main Component ─────────────────────────────────────────────────

export default function ClientDetailPage() {
  const params = useParams();
  const clientId = params.id as string;

  const [client, setClient] = useState<Client | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Overview data
  const [stats, setStats] = useState<CheckinStats | null>(null);
  const [recentCheckins, setRecentCheckins] = useState<Checkin[]>([]);

  // Check-ins tab data
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [checkinsLoading, setCheckinsLoading] = useState(false);

  // Interventions tab data
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [interventionsLoading, setInterventionsLoading] = useState(false);
  const [isInterventionModalOpen, setIsInterventionModalOpen] = useState(false);
  const [manualMessage, setManualMessage] = useState('');
  const [isCreatingIntervention, setIsCreatingIntervention] = useState(false);

  // ── Fetch client on mount ──
  useEffect(() => {
    setLoading(true);
    api<Client>(`/api/clients/${clientId}`)
      .then(setClient)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [clientId]);

  // ── Fetch overview data when client loads ──
  useEffect(() => {
    if (!client) return;
    api<CheckinStats>(`/api/clients/${clientId}/checkins/stats`)
      .then(setStats)
      .catch(() => {});
    api<{ data: Checkin[] }>(`/api/clients/${clientId}/checkins`)
      .then((res) => setRecentCheckins((res.data ?? []).slice(0, 5)))
      .catch(() => {});
  }, [client, clientId]);

  // ── Fetch tab data ──
  useEffect(() => {
    if (tab === 'checkins') {
      setCheckinsLoading(true);
      api<{ data: Checkin[]; total?: number }>(`/api/clients/${clientId}/checkins`)
        .then((res) => setCheckins(res.data ?? []))
        .catch(() => {})
        .finally(() => setCheckinsLoading(false));
    } else if (tab === 'interventions') {
      setInterventionsLoading(true);
      api<Intervention[]>(`/api/clients/${clientId}/interventions`)
        .then(setInterventions)
        .catch(() => {})
        .finally(() => setInterventionsLoading(false));
    }
  }, [tab, clientId]);

  const handleStatusChange = async (status: string) => {
    try {
      await api(`/api/clients/${clientId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setClient((prev) => (prev ? { ...prev, status } : prev));
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleCreateIntervention = async () => {
    if (!manualMessage.trim()) return;
    setIsCreatingIntervention(true);
    try {
      const newIv = await api<Intervention>(`/api/interventions/manual`, {
        method: 'POST',
        body: JSON.stringify({
          client_id: clientId,
          draft_message: manualMessage,
        }),
      });
      setInterventions(prev => [newIv, ...prev]);
      setIsInterventionModalOpen(false);
      setManualMessage('');
    } catch (err) {
      console.error('Failed to create intervention:', err);
    } finally {
      setIsCreatingIntervention(false);
    }
  };

  if (loading) return (
    <AuthLayout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div className="spinner" />
      </div>
    </AuthLayout>
  );

  if (error || !client) return (
    <AuthLayout>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <p style={{ color: cs.danger, fontSize: '16px', fontWeight: 600, marginBottom: '24px' }}>
          {error ?? ' PERSONNEL IDENTITY NOT RECOGNIZED'}
        </p>
        <Link href="/clients" style={btn('secondary')}>Back to Fleet</Link>
      </div>
    </AuthLayout>
  );

  const st = statusStyle(client.status);
  const initials = client.full_name.split(' ').map(n => n[0]).join('').toUpperCase();

  return (
    <AuthLayout>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Navigation Breadcrumb */}
        <motion.div 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          style={{ marginBottom: '32px' }}
        >
          <Link
            href="/clients"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              color: cs.textDim,
              textDecoration: 'none',
              fontWeight: 600,
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = cs.primary; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = cs.textDim; }}
          >
            <ChevronLeft size={16} strokeWidth={2.5} />
            RESTORE FLEET INTERFACE
          </Link>
        </motion.div>

        {/* Hero Header */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '32px', marginBottom: '56px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '24px',
                background: `linear-gradient(135deg, ${cs.primaryGlow}, rgba(223, 255, 0, 0.05))`,
                padding: '2px',
                flexShrink: 0,
                boxShadow: `0 20px 40px rgba(0,0,0,0.3)`
              }}>
              <div style={{
                width: '100%',
                height: '100%',
                borderRadius: '22px',
                background: cs.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '28px',
                fontWeight: 900,
                color: cs.primary,
                border: `1.5px solid rgba(223, 255, 0, 0.1)`
              }}>
                {initials}
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h1 style={{ fontSize: '36px', fontWeight: 800, color: cs.textHeading, margin: 0, letterSpacing: '-0.04em' }}>
                {client.full_name}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                <span style={{ fontSize: '14px', color: cs.textDim, fontWeight: 500 }}>{client.email}</span>
                <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
                <span style={{ fontSize: '14px', color: cs.primary, fontWeight: 700 }}>PHASE {client.program_week} &middot; DAY {client.program_day}</span>
                {client.chronotype && (
                   <>
                    <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
                    <span style={{ fontSize: '11px', fontWeight: 900, color: cs.violet, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{client.chronotype}</span>
                   </>
                )}
              </div>
            </motion.div>
          </div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            style={{ display: 'flex', gap: '16px' }}
          >
            <div style={{
              padding: '10px 20px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              background: st.bg,
              color: st.fg,
              border: `1.5px solid ${st.border}`,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <div className="animate-pulse" style={{ width: 8, height: 8, borderRadius: '50%', background: st.fg }} />
              {client.status}
            </div>

            <button
              onClick={() => handleStatusChange(client.status === 'active' ? 'paused' : 'active')}
              className="glow-border"
              style={{
                padding: '10px 24px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: 800,
                cursor: 'pointer',
                background: 'rgba(255,255,255,0.03)',
                color: cs.textHeading,
                border: `1px solid rgba(255,255,255,0.06)`,
                transition: 'all 0.2s ease',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
            >
              {client.status === 'active' ? 'INITIALIZE PAUSE' : 'RESUME PROTOCOLS'}
            </button>
          </motion.div>
        </div>

        {/* biological Status KPI Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '56px' }}>
          <KpiCard 
            label="Current Adherence Index" 
            value={`${client.rolling_7d_adherence ?? 0}%`} 
            icon={Activity}
            color={adherenceColor(client.rolling_7d_adherence ?? 0)}
            progress={client.rolling_7d_adherence ?? 0}
          />
          <KpiCard 
            label="Consecutive Momentum" 
            value={`${client.streak_count ?? 0} DAYS`} 
            icon={Zap}
            color={cs.primary}
          />
          <KpiCard 
            label="Neural Focus (Avg)" 
            value={stats?.avg_energy != null ? `${Number(stats.avg_energy).toFixed(1)}/10` : '--'} 
            icon={Target}
            color={cs.violet}
          />
          <KpiCard 
            label="Regen Phase (Avg)" 
            value={stats?.avg_sleep != null ? `${Number(stats.avg_sleep).toFixed(1)}H` : '--'} 
            icon={Moon}
            color="#0a84ff"
          />
        </div>

        {/* Custom Tabs */}
        <div style={{ 
          display: 'flex', 
          gap: '12px', 
          marginBottom: '40px',
          background: 'rgba(255,255,255,0.02)',
          padding: '8px',
          borderRadius: '16px',
          width: 'fit-content',
          border: `1px solid rgba(255,255,255,0.05)`
        }}>
          {TABS.map((t) => {
            const isActive = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '12px',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  background: isActive ? cs.primary : 'transparent',
                  color: isActive ? '#000' : cs.textDim,
                  border: 'none',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  boxShadow: isActive ? `0 8px 16px ${cs.primaryGlow}` : 'none'
                }}
              >
                <t.icon size={16} strokeWidth={ isActive ? 3 : 2 } />
                {t.label.toUpperCase()}
              </button>
            )
          })}
        </div>

        {/* Tab Content with AnimatePresence */}
        <div style={{ minHeight: '400px' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
            >
              {tab === 'overview' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '24px' }}>
                  <DataPanel title="System Targets" icon={Target}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                       <div>
                          <DetailRow label="Circadian Wake" value={client.target_wake_time} icon={Sun} />
                          <DetailRow label="Restorative Sleep" value={client.target_bedtime} icon={Moon} />
                          <DetailRow label="Caffeine Deadline" value={client.target_caffeine_cutoff} icon={Coffee} />
                       </div>
                       <div>
                          <DetailRow label="Luminous Intake" value={client.morning_light_duration_min ? `${client.morning_light_duration_min} MIN` : 'N/A'} icon={Sparkles} />
                          <DetailRow label="Kinetic Phase" value={client.morning_exercise_time} icon={Activity} />
                          <DetailRow label="Cognitive Peak" value={client.target_peak_window} icon={Brain} />
                       </div>
                    </div>
                  </DataPanel>

                  <DataPanel title="Identity Metadata" icon={User}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                       <div>
                          <DetailRow label="Inception Date" value={client.program_start_date} />
                          <DetailRow label="Termination Date" value={client.program_end_date} />
                          <DetailRow label="MEQ Variance" value={client.meq_score?.toString() ?? '--'} />
                       </div>
                       <div>
                          <DetailRow label="AM Calibration" value={client.checkin_time_am} />
                          <DetailRow label="PM Calibration" value={client.checkin_time_pm} />
                          <DetailRow label="Primary Objective" value={client.primary_goal ?? '--'} />
                       </div>
                    </div>
                  </DataPanel>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <DataPanel title="Recent Signal Samples" icon={Activity}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {recentCheckins.map((ci, i) => (
                          <SignalRow key={ci.id} ci={ci} idx={i} />
                        ))}
                      </div>
                    </DataPanel>
                  </div>
                </div>
              )}

              {tab === 'checkins' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                   {checkinsLoading ? (
                      <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}><div className="spinner" /></div>
                   ) : checkins.length === 0 ? (
                      <EmptyDisplay message="NO ACTIVITY LOGS DETECTED" />
                   ) : (
                      checkins.map((ci, i) => <CheckinAnalysisCard key={ci.id} ci={ci} idx={i} />)
                   )}
                </div>
              )}

              {tab === 'interventions' && (
                <div>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: 800, color: cs.textHeading, margin: 0, letterSpacing: '-0.02em' }}>CORRECTION PROTOCOLS</h3>
                      <button
                        onClick={() => setIsInterventionModalOpen(true)}
                        className="glow-border"
                        style={{
                          ...btn('primary', {
                            padding: '12px 24px',
                            borderRadius: '12px',
                            fontSize: '13px',
                            fontWeight: 800,
                            gap: '10px'
                          })
                        }}
                      >
                        <Plus size={18} strokeWidth={3} /> INITIALIZE INTERVENTION
                      </button>
                   </div>
                   
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {interventionsLoading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}><div className="spinner" /></div>
                      ) : interventions.length === 0 ? (
                        <EmptyDisplay message="NO CORRECTION PROTOCOLS RECORDED" />
                      ) : (
                        interventions.map((iv, i) => <InterventionHistoryCard key={iv.id} iv={iv} idx={i} />)
                      )}
                   </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Modal: New Intervention */}
        <AnimatePresence>
          {isInterventionModalOpen && (
            <div style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(5, 5, 8, 0.85)',
              backdropFilter: 'blur(12px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '24px',
            }}>
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="glass-card glow-border"
                style={{ width: '100%', maxWidth: '560px', padding: '40px', position: 'relative' }}
              >
                <button 
                   onClick={() => setIsInterventionModalOpen(false)}
                   style={{ position: 'absolute', right: '24px', top: '24px', padding: '4px', background: 'transparent', border: 'none', color: cs.textDim, cursor: 'pointer' }}
                >
                   <X size={24} />
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '32px' }}>
                   <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(223, 255, 0, 0.1)', color: cs.primary }}>
                      <MessageSquare size={24} />
                   </div>
                   <div>
                      <h3 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: cs.textHeading, letterSpacing: '-0.03em' }}>
                        Protocol Interface
                      </h3>
                      <p style={{ margin: '4px 0 0', fontSize: '14px', color: cs.textDim, fontWeight: 500 }}>
                        Direct transmission to {client.full_name}'s secure link.
                      </p>
                   </div>
                </div>

                <div style={{ marginBottom: '32px' }}>
                  <label className="float-label">Payload Message</label>
                  <textarea
                    value={manualMessage}
                    onChange={(e) => setManualMessage(e.target.value)}
                    placeholder="Input correction protocol instructions..."
                    style={{
                      ...inp({ height: '160px', resize: 'none', borderRadius: '16px', paddingTop: '16px', fontSize: '15px' }),
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setIsInterventionModalOpen(false)}
                    style={btn('secondary', { padding: '14px 28px', borderRadius: '14px', fontSize: '14px', fontWeight: 600 })}
                    disabled={isCreatingIntervention}
                  >
                    TERMINATE
                  </button>
                  <button
                    onClick={handleCreateIntervention}
                    style={{
                      ...btn('primary', { padding: '14px 32px', borderRadius: '14px', fontSize: '14px', fontWeight: 800, gap: '10px' }),
                    }}
                    disabled={isCreatingIntervention || !manualMessage.trim()}
                  >
                    {isCreatingIntervention ? 'TRANSMITTING...' : <><Send size={18} strokeWidth={2.5}/> DEPLOY PAYLOAD</>}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AuthLayout>
  );
}

// ── Components ──

function KpiCard({ label, value, icon: Icon, color, progress }: any) {
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="glass-card card-beam glow-border"
      style={{ padding: '24px', background: 'rgba(255,255,255,0.01)' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', color: cs.textDim }}>
         <Icon size={16} color={color} />
         <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</span>
      </div>
      <div style={{ fontSize: '32px', fontWeight: 900, color: color ?? cs.textHeading, letterSpacing: '-0.04em' }}>
        {value}
      </div>
      {progress !== undefined && (
        <div style={{ marginTop: '20px', height: '6px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.02)' }}>
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, progress)}%` }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            style={{ height: '100%', background: color, boxShadow: `0 0 15px ${color}30` }} 
          />
        </div>
      )}
    </motion.div>
  );
}

function DataPanel({ title, icon: Icon, children }: any) {
  return (
    <div className="glass-card" style={{ padding: '32px', border: `1.5px solid rgba(255,255,255,0.04)` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
         <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', color: cs.primary }}>
            <Icon size={18} />
         </div>
         <h3 style={{ fontSize: '15px', fontWeight: 800, color: cs.textHeading, textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
            {title}
         </h3>
      </div>
      {children}
    </div>
  );
}

function DetailRow({ label, value, icon: Icon }: any) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 0', borderBottom: `1px solid rgba(255,255,255,0.03)` }}>
      {Icon && <Icon size={14} color={cs.textDim} opacity={0.6} />}
      <div style={{ flex: 1 }}>
         <div style={{ fontSize: '10px', fontWeight: 800, color: cs.textDim, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>{label}</div>
         <div style={{ fontSize: '15px', color: cs.textHeading, fontWeight: 700 }}>{value || '--'}</div>
      </div>
    </div>
  );
}

function SignalRow({ ci, idx }: any) {
  const [hovered, setHovered] = useState(false);
  const color = ci.type === 'morning' ? cs.primary : cs.violet;
  const adh = ci.adherence_score ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.2 + idx * 0.05 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px',
        borderRadius: '14px',
        background: hovered ? 'rgba(255,255,255,0.03)' : 'transparent',
        border: `1px solid ${hovered ? 'rgba(255,255,255,0.05)' : 'transparent'}`,
        transition: 'all 0.2s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <span style={{ fontSize: '13px', color: cs.textDim, fontWeight: 700, width: '100px' }}>
          {new Date(ci.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
        <div style={{
          padding: '4px 12px',
          borderRadius: '100px',
          fontSize: '10px',
          fontWeight: 900,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          background: `${color}10`,
          color,
          border: `1px solid ${color}30`
        }}>
          {ci.type}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
        <div style={{ textAlign: 'right' }}>
           <div style={{ fontSize: '10px', color: cs.textDim, fontWeight: 800, textTransform: 'uppercase' }}>Index</div>
           <div style={{ color: adherenceColor(adh), fontWeight: 900, fontSize: '15px' }}>{adh}%</div>
        </div>
        <ChevronRight size={18} color={cs.textDim} opacity={0.5} />
      </div>
    </motion.div>
  );
}

function CheckinAnalysisCard({ ci, idx }: any) {
  const adh = ci.adherence_score ?? 0;
  const color = ci.type === 'morning' ? cs.primary : cs.violet;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: idx * 0.08 }}
      className="glass-card card-beam"
      style={{ padding: '24px 32px', border: `1px solid rgba(255,255,255,0.05)` }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
           <div style={{ 
              width: '44px', height: '44px', borderRadius: '12px', 
              background: `linear-gradient(135deg, ${color}15, rgba(255,255,255,0.05))`, 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `1px solid ${color}30`,
              color
           }}>
              {ci.type === 'morning' ? <Sun size={20} /> : <Moon size={20} />}
           </div>
           <div>
              <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: cs.textHeading }}>
                {new Date(ci.submitted_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                 <Clock size={12} color={cs.textDim} />
                 <span style={{ fontSize: '12px', color: cs.textDim, fontWeight: 500 }}>{new Date(ci.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                 <span style={{ color: cs.primary, fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>&bull; {ci.type} CALIBRATION</span>
              </div>
           </div>
        </div>
        
        <div style={{ textAlign: 'right' }}>
           <div style={{ fontSize: '10px', color: cs.textDim, fontWeight: 900, textTransform: 'uppercase', marginBottom: '4px' }}>Adherence Index</div>
           <div style={{ fontSize: '24px', fontWeight: 900, color: adherenceColor(adh) }}>{adh}%</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '24px' }}>
         <SmallMetric label="Energy" value={ci.energy_rating != null ? `${ci.energy_rating}/10` : 'N/A'} color={cs.primary} />
         <SmallMetric label="Focus" value={ci.focus_rating != null ? `${ci.focus_rating}/10` : 'N/A'} color={cs.violet} />
         <SmallMetric label="Sleep" value={ci.sleep_hours != null ? `${ci.sleep_hours}H` : 'N/A'} color="#0a84ff" />
      </div>

      {ci.ai_analysis && (
        <div style={{
          padding: '20px',
          background: 'rgba(10, 132, 255, 0.04)',
          borderRadius: '14px',
          border: `1.2px solid rgba(10, 132, 255, 0.1)`,
          display: 'flex',
          gap: '16px'
        }}>
          <Sparkles size={18} color="#0a84ff" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
             <div style={{ fontSize: '10px', fontWeight: 900, color: '#0a84ff', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Neural Engine Summary</div>
             <p style={{ fontSize: '14px', color: cs.textHeading, lineHeight: '1.6', margin: 0, fontWeight: 500 }}>{ci.ai_analysis}</p>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function SmallMetric({ label, value, color }: any) {
  return (
    <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: `1px solid rgba(255,255,255,0.04)` }}>
       <div style={{ fontSize: '10px', color: cs.textDim, fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>{label}</div>
       <div style={{ fontSize: '16px', fontWeight: 800, color }}>{value}</div>
    </div>
  );
}

function InterventionHistoryCard({ iv, idx }: any) {
  const ss = statusStyle(iv.status);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.05 }}
      style={{
        ...glassCard({ padding: '24px 32px' }),
        border: `1.2px solid rgba(255,255,255,0.05)`
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <StatusBadge status={iv.status} ss={ss} />
        <span style={{ fontSize: '12px', color: cs.textDim, fontWeight: 700 }}>
          {new Date(iv.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </span>
      </div>

      <p style={{ fontSize: '15px', color: cs.textHeading, lineHeight: '1.7', fontWeight: 500, margin: '0 0 20px 0' }}>
        {iv.final_message ?? iv.draft_message}
      </p>

      {iv.trigger_condition && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '10px',
          background: 'rgba(255, 69, 58, 0.04)',
          border: `1px solid rgba(255, 69, 58, 0.1)`,
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <AlertTriangle size={14} color="#ff453a" opacity={0.6} />
          <div>
            <span style={{ fontSize: '10px', color: '#ff453a', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Trigger Exception: </span>
            <span style={{ fontSize: '13px', color: cs.textDim, fontWeight: 500 }}>{iv.trigger_condition}</span>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function StatusBadge({ status, ss }: any) {
  return (
    <div style={{
      padding: '4px 12px',
      borderRadius: '100px',
      fontSize: '10px',
      fontWeight: 900,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      background: ss.bg,
      color: ss.fg,
      border: `1.5px solid ${ss.border}`
    }}>
      {status}
    </div>
  );
}

function EmptyDisplay({ message }: any) {
  return (
    <div style={{ padding: '100px 40px', textAlign: 'center', background: 'rgba(255,255,255,0.01)', borderRadius: '24px', border: `1.5px solid rgba(255,255,255,0.03)` }}>
       <h4 style={{ color: cs.textDim, fontSize: '14px', fontWeight: 700, letterSpacing: '0.1em' }}>{message}</h4>
    </div>
  );
}

const AlertTriangle = (props: any) => (
  <svg {...props} width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);
