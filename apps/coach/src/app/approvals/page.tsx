'use client';

import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { AuthLayout } from '../../components/layout';
import { cs, statusStyle } from '../../lib/styles';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  AlertCircle,
  Zap,
  Check,
  ClipboardList,
  Mail,
  Smartphone,
  Calendar,
  Layers,
  Activity,
  Clock,
  TrendingUp
} from 'lucide-react';

interface Registration {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  discord_username: string | null;
  discord_user_id: string;
  preferred_start_date: string;
  goals: string | null;
  key_changes: string | null;
  short_term_goals: string | null;
  long_term_goals: string | null;
  goal_motivation: string | null;
  bottlenecks: string | null;
  checkin_time_am: string | null;
  current_wake_time: string | null;
  peak_mental_time: string | null;
  wearable_device: string | null;
  status: string;
  created_at: string;
}

export default function ApprovalsPage() {
  const [regs, setRegs] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const load = () => {
    api<Registration[]>('/api/registrations')
      .then(setRegs)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    setProcessing(id);
    setToast(null);
    try {
      await api(`/api/registrations/${id}/${action}`, {
        method: 'PATCH',
        body:
          action === 'reject'
            ? JSON.stringify({ reason: 'Not accepted at this time' })
            : undefined,
      });
      setToast({
        message: action === 'approve' ? 'Personnel activated. Provisioning protocol...' : 'Registration purged from queue.',
        type: 'success'
      });
      load();
    } catch (err) {
      setToast({
        message: `Error: ${err instanceof Error ? err.message : 'Unknown'}`,
        type: 'error'
      });
    } finally {
      setProcessing(null);
    }
  };

  const pending = regs.filter((r) => r.status === 'pending');
  const processed = regs.filter((r) => r.status !== 'pending');

  return (
    <AuthLayout>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        {/* Page header */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '56px' }}
        >
          <div>
             <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <div style={{ 
                  padding: '4px 10px', 
                  borderRadius: '100px', 
                  background: cs.primarySoft, 
                  border: `1.5px solid ${cs.primary}30`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <div className="animate-pulse" style={{ width: 6, height: 6, borderRadius: '50%', background: cs.primary }} />
                  <span style={{ fontSize: '10px', fontWeight: 800, color: cs.primary, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                    Awaiting Verification
                  </span>
                </div>
             </div>
             <h1 style={{ fontSize: '42px', fontWeight: 800, color: cs.textHeading, margin: 0, letterSpacing: '-0.04em' }}>
               Onboarding <span style={{ color: cs.primary }}>Pipeline</span>.
             </h1>
             <p style={{ fontSize: '15px', color: cs.textDim, marginTop: '12px', fontWeight: 500 }}>
               Review and authorize new personnel for biological optimization protocols.
             </p>
          </div>
        </motion.div>

        {/* Toast */}
        <AnimatePresence mode="wait">
          {toast && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              className="premium-blur"
              style={{
                marginBottom: '32px',
                padding: '18px 24px',
                borderRadius: '20px',
                fontSize: '15px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '14px',
                zIndex: 100,
                boxShadow: `0 20px 40px rgba(0,0,0,0.4)`,
                ...(toast.type === 'error'
                  ? {
                      background: 'rgba(255, 69, 58, 0.15)',
                      border: `1.5px solid rgba(255, 69, 58, 0.3)`,
                      color: '#ff9b9b',
                    }
                  : {
                      background: 'rgba(223, 255, 0, 0.1)',
                      border: `1.5px solid ${cs.primary}30`,
                      color: cs.primary,
                    }),
              }}
            >
              {toast.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
              {toast.message}
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '120px 0' }}>
             <div className="spinner" />
          </div>
        ) : (
          <>
            {/* Pending Section */}
            <section style={{ marginBottom: '64px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '28px' }}>
                <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${cs.border}` }}>
                  <Layers size={18} color={cs.textDim} />
                </div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: cs.textHeading, margin: 0, letterSpacing: '-0.02em' }}>Inbound Requests</h2>
                <div style={{ 
                  background: cs.primary, 
                  color: '#000', 
                  fontSize: '11px', 
                  fontWeight: 900, 
                  padding: '2px 10px', 
                  borderRadius: '6px',
                  boxShadow: `0 0 15px ${cs.primaryGlow}`
                }}>
                  {pending.length}
                </div>
              </div>

              {pending.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="glass-card" 
                  style={{ padding: '80px 40px', textAlign: 'center', borderStyle: 'dashed' }}
                >
                  <ClipboardList size={40} color={cs.textDim} style={{ marginBottom: '20px', opacity: 0.3 }} />
                  <p style={{ color: cs.textDim, fontSize: '15px', margin: 0, fontWeight: 500 }}>The queue is currently empty. All personnel matched.</p>
                </motion.div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {pending.map((reg, idx) => (
                    <PendingCard 
                      key={reg.id} 
                      reg={reg} 
                      idx={idx}
                      isExpanded={expanded === reg.id}
                      onToggle={() => setExpanded(expanded === reg.id ? null : reg.id)}
                      onAction={handleAction}
                      isProcessing={processing === reg.id}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Processed Section */}
            <section>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '28px' }}>
                <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${cs.border}` }}>
                  <Activity size={18} color={cs.textDim} />
                </div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: cs.textHeading, margin: 0, letterSpacing: '-0.02em' }}>Manifest Archive</h2>
                <span style={{ color: cs.textDim, fontSize: '12px', fontWeight: 600, letterSpacing: '0.05em' }}>{processed.length} TOTAL ENTRIES</span>
              </div>

              {processed.length === 0 ? (
                <p style={{ fontSize: '15px', color: cs.textDim, fontWeight: 500 }}>No historical data available.</p>
              ) : (
                <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                   {/* Table Header */}
                   <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: '1.8fr 1.2fr 1fr 1fr',
                      padding: '20px 32px',
                      background: 'rgba(255,255,255,0.015)',
                      borderBottom: `1px solid ${cs.border}`
                   }}>
                      {['Subject', 'Identification', 'Protocol Status', 'Timestamp'].map(h => (
                        <span key={h} style={{ fontSize: '10px', fontWeight: 800, color: cs.textDim, textTransform: 'uppercase', letterSpacing: '0.12em' }}>{h}</span>
                      ))}
                   </div>
                   {processed.map((reg, i) => {
                      const ss = statusStyle(reg.status);
                      return (
                        <motion.div 
                          key={reg.id}
                          whileHover={{ background: 'rgba(223, 255, 0, 0.01)' }}
                          style={{
                            display: 'grid', 
                            gridTemplateColumns: '1.8fr 1.2fr 1fr 1fr',
                            padding: '20px 32px',
                            alignItems: 'center',
                            borderBottom: i < processed.length - 1 ? `1px solid ${cs.borderLight}` : 'none',
                            transition: 'background 0.2s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                             <div style={{ 
                               width: '36px', height: '36px', borderRadius: '10px', 
                               background: `linear-gradient(135deg, ${cs.surfaceRaised}, rgba(255,255,255,0.05))`, 
                               display: 'flex', alignItems: 'center', justifyContent: 'center', 
                               fontSize: '13px', fontWeight: 800, color: cs.primary,
                               border: `1px solid rgba(255,255,255,0.05)`
                             }}>
                                {reg.full_name.charAt(0)}
                             </div>
                             <span style={{ fontSize: '15px', fontWeight: 700, color: cs.textHeading }}>{reg.full_name}</span>
                          </div>
                          <span style={{ fontSize: '13px', color: cs.textDim, fontWeight: 500 }}>{reg.email}</span>
                          <div>
                            <span style={{
                              padding: '5px 12px',
                              borderRadius: '100px',
                              fontSize: '10px',
                              fontWeight: 900,
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              background: ss.bg,
                              color: ss.fg,
                              border: `1.5px solid ${ss.border}`,
                            }}>
                              {reg.status}
                            </span>
                          </div>
                          <span style={{ fontSize: '13px', color: cs.textDim, fontWeight: 500 }}>{new Date(reg.created_at).toLocaleDateString()}</span>
                        </motion.div>
                      )
                   })}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </AuthLayout>
  );
}

function PendingCard({ reg, idx, isExpanded, onToggle, onAction, isProcessing }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.1 }}
      className={`glass-card card-beam glow-border ${isExpanded ? 'premium-blur' : ''}`}
      style={{ 
        padding: 0,
        background: isExpanded ? 'rgba(255, 255, 255, 0.02)' : 'rgba(14,14,17,0.7)',
        borderColor: isExpanded ? `${cs.primary}40` : 'rgba(255,255,255,0.06)',
      }}
    >
       <div 
         onClick={onToggle}
         style={{ padding: '24px 32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
       >
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
             <div style={{ 
                width: '56px', height: '56px', borderRadius: '16px', 
                background: `linear-gradient(135deg, ${cs.primaryGlow}, rgba(137, 222, 246, 0.1))`, 
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '20px', fontWeight: 900, color: cs.primary,
                border: `1.5px solid rgba(223, 255, 0, 0.1)`,
                boxShadow: `0 10px 20px rgba(0,0,0,0.2)`
             }}>
                {reg.full_name.charAt(0)}
             </div>
             <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: cs.textHeading, margin: '0 0 6px', letterSpacing: '-0.02em' }}>{reg.full_name}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: cs.textDim, fontWeight: 500 }}>
                      <Mail size={14} /> {reg.email}
                   </div>
                   <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }}></div>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: cs.primary, fontWeight: 700 }}>
                      <Calendar size={14} /> Start: {reg.preferred_start_date}
                   </div>
                </div>
             </div>
          </div>
          <div style={{ color: cs.textDim }}>
             {isExpanded ? <ChevronUp size={22} strokeWidth={2.5} /> : <ChevronDown size={22} strokeWidth={2.5} />}
          </div>
       </div>

       <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{ padding: '0 32px 32px', borderTop: `1px solid ${cs.borderLight}`, marginTop: '8px' }}>
                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px', paddingTop: '24px' }}>
                    <Field icon={<Zap size={14}/>} label="Discord Interface" value={reg.discord_username || reg.discord_user_id} />
                    <Field icon={<Smartphone size={14}/>} label="Mobile Link" value={reg.phone || 'NO LINK'} />
                    <Field icon={<Activity size={14}/>} label="Bio Sensor" value={reg.wearable_device || 'N/A'} />
                    <Field icon={<CheckCircle2 size={14}/>} label="AM Pulse Phase" value={reg.checkin_time_am || 'N/A'} />
                    <Field icon={<Clock size={14}/>} label="Circadian Wake" value={reg.current_wake_time || 'N/A'} />
                    <Field icon={<TrendingUp size={14}/>} label="Cognitive Peak" value={reg.peak_mental_time || 'N/A'} />
                 </div>

                 <div style={{ marginTop: '24px', display: 'grid', gap: '16px' }}>
                    {reg.goals && <BigField label="Core Objectives & System Vision" value={reg.goals} />}
                    {reg.bottlenecks && <BigField label="System Bottlenecks" value={reg.bottlenecks} />}
                 </div>

                 <div style={{ display: 'flex', gap: '16px', marginTop: '40px' }}>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onAction(reg.id, 'approve'); }}
                      disabled={isProcessing}
                      style={{
                        padding: '16px 40px',
                        background: cs.primary,
                        color: '#000',
                        border: 'none',
                        borderRadius: '14px',
                        fontSize: '15px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        boxShadow: `0 8px 24px ${cs.primaryGlow}, 0 4px 12px rgba(223, 255, 0, 0.2)`,
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 12px 32px ${cs.primaryGlow}`; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 8px 24px ${cs.primaryGlow}`; }}
                    >
                      {isProcessing ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                          ACTIVATE...
                        </div>
                      ) : (
                        <><Check size={20} strokeWidth={3} /> ACTIVATE PERSONNEL</>
                      )}
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onAction(reg.id, 'reject'); }}
                      disabled={isProcessing}
                      style={{
                        padding: '16px 32px',
                        background: 'rgba(255, 69, 58, 0.05)',
                        color: cs.danger,
                        border: `1.5px solid ${cs.dangerBorder}`,
                        borderRadius: '14px',
                        fontSize: '15px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 69, 58, 0.1)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 69, 58, 0.05)'; }}
                    >
                      PURGE
                    </button>
                 </div>
              </div>
            </motion.div>
          )}
       </AnimatePresence>
    </motion.div>
  );
}

function Field({ icon, label, value }: any) {
  return (
    <div style={{ padding: '14px', background: 'rgba(255,255,255,0.02)', borderRadius: '14px', border: `1px solid rgba(255,255,255,0.04)` }}>
       <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', fontWeight: 800, color: cs.textDim, textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.05em' }}>
          {icon} {label}
       </div>
       <div style={{ fontSize: '14px', fontWeight: 700, color: cs.textHeading }}>{value}</div>
    </div>
  );
}

function BigField({ label, value }: any) {
  return (
    <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: `1px solid rgba(255,255,255,0.04)` }}>
       <div style={{ fontSize: '10px', fontWeight: 900, color: cs.primary, textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.1em', opacity: 0.8 }}>{label}</div>
       <div style={{ fontSize: '15px', color: cs.textHeading, lineHeight: '1.7', fontWeight: 500 }}>{value}</div>
    </div>
  );
}
