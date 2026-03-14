'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { AuthLayout } from '../../../components/layout';
import { cs, glassCard } from '../../../lib/styles';
import { motion } from 'framer-motion';
import { 
  Sun, 
  Moon, 
  Coffee, 
  Zap, 
  Sparkles, 
  Activity, 
  Calendar,
  BookOpen,
  Target,
  MessageSquare
} from 'lucide-react';

interface ProgramData {
  client: {
    id: string;
    full_name: string;
    program_week: number;
    program_day: number;
    program_start_date: string;
    program_end_date: string;
    status: string;
    phase_name: string;
    month_theme: string;
    target_wake_time: string;
    target_bedtime: string;
    target_caffeine_cutoff: string;
    morning_light_duration_min: number;
    morning_exercise_time: string;
    target_peak_window: string;
    checkin_prompt_am: string;
    checkin_prompt_pm: string;
  };
  recentCheckIns: any[];
  upcomingEvents: Array<{
    id: string;
    title: string;
    type: string;
    scheduled_at: string;
    status: string;
  }>;
  weekStats: any;
}

export default function ProgramPage() {
  const [data, setData] = useState<ProgramData | null>(null);
  const [interventions, setInterventions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<ProgramData>('/api/dashboard/client')
      .then((d) => {
        setData(d);
        api(`/api/clients/${d.client.id}/interventions`)
          .then((ivs: any) => setInterventions(Array.isArray(ivs) ? ivs.filter((i: any) => i.status === 'sent').slice(0, 5) : []))
          .catch(() => {});
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <AuthLayout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '100px 0' }}>
           <motion.div 
             animate={{ rotate: 360 }}
             transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
             style={{ color: cs.primary }}
           >
             <Zap size={32} />
           </motion.div>
        </div>
      </AuthLayout>
    );
  }

  if (!data) {
    return (
      <AuthLayout>
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <p style={{ color: cs.danger }}>Failed to load program architecture.</p>
        </div>
      </AuthLayout>
    );
  }

  const { client, upcomingEvents } = data;
  const totalDays = 90;
  const currentDay = (client.program_week - 1) * 7 + client.program_day;
  const progress = Math.round((currentDay / totalDays) * 100);
  const month = client.program_week <= 4 ? 1 : client.program_week <= 8 ? 2 : 3;

  const phases = [
    { num: 1, label: 'Foundation', dayRange: '1-30' },
    { num: 2, label: 'Optimization', dayRange: '31-60' },
    { num: 3, label: 'Integration', dayRange: '61-90' },
  ];

  return (
    <AuthLayout>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {/* Progress hero card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            ...glassCard({ marginBottom: '32px' }),
            background: cs.gradientSubtle,
            border: `1px solid ${cs.border}`,
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: cs.primary }} />
          
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '20px', marginBottom: '32px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <BookOpen size={16} color={cs.primary} />
                <span style={{ fontSize: '12px', fontWeight: 800, color: cs.primary, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  {client.phase_name}
                </span>
              </div>
              <h2 style={{ fontSize: '28px', fontWeight: 800, color: cs.textHeading, margin: 0, letterSpacing: '-0.04em' }}>
                {client.month_theme}
              </h2>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '32px', fontWeight: 800, color: cs.textHeading, letterSpacing: '-0.04em' }}>
                Day {currentDay} <span style={{ color: cs.textDim, fontSize: '18px', fontWeight: 500 }}>/ {totalDays}</span>
              </div>
              <div style={{ fontSize: '12px', color: cs.primary, fontWeight: 700, textTransform: 'uppercase' }}>{progress}% COMPLETE</div>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ width: '100%', height: '10px', borderRadius: '100px', overflow: 'hidden', background: cs.surfaceRaised, marginBottom: '24px' }}>
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              style={{
                height: '100%',
                borderRadius: '100px',
                background: cs.gradient,
              }} 
            />
          </div>

          {/* Phase markers */}
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            {phases.map((m) => {
              const active = month >= m.num;
              const current = month === m.num;
              return (
                <div key={m.num} style={{ display: 'flex', alignItems: 'center', gap: '10px', opacity: active ? 1 : 0.4 }}>
                  <div style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: active ? cs.primary : cs.surfaceRaised,
                    boxShadow: current ? `0 0 15px ${cs.primaryGlow}` : 'none',
                    border: current ? `2px solid #fff` : 'none',
                  }} />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: active ? cs.textHeading : cs.textDim }}>{m.label}</div>
                    <div style={{ fontSize: '11px', color: cs.textDim }}>Day {m.dayRange}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '32px' }}>
          {/* Protocol Targets */}
          <div style={glassCard()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <Target size={18} color={cs.primary} />
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: cs.textHeading, margin: 0 }}>Protocol Targets</h3>
            </div>
            <div style={{ display: 'grid', gap: '12px' }}>
              <TargetItem icon={Sun} label="Wake Time" value={client.target_wake_time} color={cs.warn} />
              <TargetItem icon={Moon} label="Bedtime" value={client.target_bedtime} color={cs.violet} />
              <TargetItem icon={Coffee} label="Caffeine Cutoff" value={client.target_caffeine_cutoff} color="#b45309" />
              <TargetItem icon={Sparkles} label="Morning Light" value={`${client.morning_light_duration_min} min`} color={cs.blue} />
              <TargetItem icon={Activity} label="Exercise" value={client.morning_exercise_time} color={cs.success} />
            </div>
          </div>

          {/* Dynamic Prompts */}
          <div style={glassCard()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <MessageSquare size={18} color={cs.blue} />
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: cs.textHeading, margin: 0 }}>Behavioral Prompts</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 800, color: cs.warn, textTransform: 'uppercase', marginBottom: '6px' }}>AM Protocol</div>
                <div style={{ 
                  padding: '16px', 
                  borderRadius: '12px', 
                  background: cs.warnBg, 
                  border: `1px solid ${cs.warnBorder}`,
                  fontSize: '14px',
                  color: cs.textHeading,
                  lineHeight: '1.6'
                }}>
                  {client.checkin_prompt_am}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 800, color: cs.violet, textTransform: 'uppercase', marginBottom: '6px' }}>PM Protocol</div>
                <div style={{ 
                  padding: '16px', 
                  borderRadius: '12px', 
                  background: cs.violetBg, 
                  border: `1px solid ${cs.violetBorder}`,
                  fontSize: '14px',
                  color: cs.textHeading,
                  lineHeight: '1.6'
                }}>
                  {client.checkin_prompt_pm}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Coach Communications */}
        {interventions.length > 0 && (
          <div style={{ ...glassCard({ marginBottom: '32px' }), background: 'rgba(223, 255, 0, 0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <Zap size={18} color={cs.primary} />
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: cs.textHeading, margin: 0 }}>Directives from Architect</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {interventions.map((iv) => (
                <div
                  key={iv.id}
                  style={{
                    padding: '20px',
                    borderRadius: '16px',
                    background: cs.surface,
                    border: `1px solid ${cs.border}`,
                    borderLeft: `4px solid ${cs.primary}`,
                  }}
                >
                  <p style={{ fontSize: '15px', color: cs.textHeading, margin: 0, lineHeight: '1.6' }}>
                    {iv.final_message ?? iv.draft_message}
                  </p>
                  <div style={{ fontSize: '11px', marginTop: '12px', color: cs.textDim, fontWeight: 600, textTransform: 'uppercase' }}>
                    {new Date(iv.sent_at ?? iv.created_at).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Calendar Feed */}
        <div style={glassCard()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={18} color={cs.textDim} />
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: cs.textHeading, margin: 0 }}>
                  Upcoming Protocol Events
                </h2>
             </div>
          </div>

          {upcomingEvents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <p style={{ color: cs.textDim, fontSize: '14px' }}>No scheduled events in the immediate window.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {upcomingEvents.map((ev, i) => (
                <div
                  key={ev.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 0',
                    borderBottom: i < upcomingEvents.length - 1 ? `1px solid ${cs.border}` : 'none',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: cs.textHeading, marginBottom: '4px' }}>{ev.title}</div>
                    <div style={{ 
                      fontSize: '10px', 
                      color: cs.primary, 
                      fontWeight: 800, 
                      textTransform: 'uppercase', 
                      letterSpacing: '0.05em',
                      background: cs.primarySoft,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      display: 'inline-block'
                    }}>
                      {ev.type}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: cs.text }}>
                      {new Date(ev.scheduled_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                    </div>
                    <div style={{ fontSize: '11px', color: cs.textDim }}>
                      {new Date(ev.scheduled_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AuthLayout>
  );
}

function TargetItem({ icon: Icon, label, value, color }: { icon: any, label: string, value: string, color: string }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 16px',
      background: 'rgba(255,255,255,0.02)',
      borderRadius: '12px',
      border: `1px solid ${cs.borderLight}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ color: color }}>
          <Icon size={14} />
        </div>
        <span style={{ fontSize: '13px', color: cs.textDim, fontWeight: 500 }}>{label}</span>
      </div>
      <span style={{ fontSize: '14px', fontWeight: 700, color: cs.textHeading }}>{value}</span>
    </div>
  );
}
