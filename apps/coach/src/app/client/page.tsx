'use client';

import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { AuthLayout } from '../../components/layout';
import { cs, font, glassCard, adherenceColor } from '../../lib/styles';
import { motion } from 'framer-motion';
import { 
  Sun, 
  Moon, 
  Coffee, 
  Zap, 
  Sparkles, 
  TrendingUp, 
  Activity, 
  Clock,
  ChevronRight,
  Flame,
  Award
} from 'lucide-react';

interface ClientDashboard {
  client: {
    id: string;
    full_name: string;
    program_week: number;
    program_day: number;
    streak_count: number;
    target_wake_time: string;
    target_bedtime: string;
    target_caffeine_cutoff: string;
    morning_light_duration_min: number;
    morning_exercise_time: string;
    target_peak_window: string;
    phase_name: string;
    month_theme: string;
    checkin_prompt_am: string;
    checkin_prompt_pm: string;
  };
  recentCheckIns: Array<{
    id: string;
    type: string;
    submitted_at: string;
    adherence_score: number | null;
    energy_rating: number | null;
    focus_rating: number | null;
    sleep_hours: number | null;
    ai_analysis: string | null;
  }>;
  upcomingEvents: any[];
  weekStats: {
    total_this_week: number;
    avg_adherence: number;
    avg_energy: number;
    avg_sleep: number;
  };
}

export default function ClientHomePage() {
  const [data, setData] = useState<ClientDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<ClientDashboard>('/api/dashboard/client')
      .then(setData)
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
          <p style={{ color: cs.danger }}>Failed to load dashboard intelligence.</p>
        </div>
      </AuthLayout>
    );
  }

  const { client, recentCheckIns, weekStats } = data;

  return (
    <AuthLayout>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {/* Welcome header */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: cs.primary, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Day {client.program_day} &bull; Week {client.program_week}
            </span>
          </div>
          <h1 style={{ fontSize: '32px', fontWeight: 800, color: cs.textHeading, letterSpacing: '-0.04em', margin: 0, fontFamily: font }}>
            Elite Performance, {client.full_name.split(' ')[0]}
          </h1>
          <p style={{ fontSize: '16px', color: cs.textDim, fontFamily: font, marginTop: '8px' }}>
            {client.phase_name}: {client.month_theme}
          </p>
        </div>

        {/* Hero Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
          <motion.div 
            whileHover={{ y: -4 }}
            style={{
              ...glassCard({ padding: '32px', textAlign: 'center' }),
              background: cs.gradientSubtle,
              border: `1px solid ${cs.border}`,
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: cs.gradient }} />
            <div style={{ position: 'absolute', top: '12px', right: '12px', opacity: 0.1 }}>
               <Flame size={48} />
            </div>
            <p style={{ fontSize: '56px', fontWeight: 800, letterSpacing: '-0.04em', margin: 0, fontFamily: font, color: cs.primary }}>
              {client.streak_count ?? 0}
            </p>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px', marginBottom: 0, color: cs.textHeading }}>Day Streak</div>
          </motion.div>

          <StatTile icon={TrendingUp} label="Adherence" value={`${weekStats?.avg_adherence ?? 0}%`} color={adherenceColor(weekStats?.avg_adherence ?? 0)} />
          <StatTile icon={Zap} label="Avg Energy" value={weekStats?.avg_energy != null ? `${weekStats.avg_energy}/10` : 'N/A'} color={cs.warn} />
          <StatTile icon={Moon} label="Avg Sleep" value={weekStats?.avg_sleep != null ? `${weekStats.avg_sleep}h` : 'N/A'} color={cs.violet} />
        </div>

        {/* Protocol Targets */}
        <div style={glassCard({ marginBottom: '32px' })}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
            <Award size={18} color={cs.primary} />
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: cs.textHeading, margin: 0 }}>
              Daily Protocol Targets
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            <ProtocolCard icon={Sun} label="Wake Time" value={client.target_wake_time} color={cs.warn} />
            <ProtocolCard icon={Sparkles} label="Morning Light" value={`${client.morning_light_duration_min} min`} color={cs.primary} />
            <ProtocolCard icon={Activity} label="Exercise" value={client.morning_exercise_time} color={cs.blue} />
            <ProtocolCard icon={Coffee} label="Caffeine Cut" value={client.target_caffeine_cutoff} color="#854d0e" />
            <ProtocolCard icon={TrendingUp} label="Peak Window" value={client.target_peak_window} color={cs.success} />
            <ProtocolCard icon={Moon} label="Bedtime" value={client.target_bedtime} color={cs.violet} />
          </div>
        </div>

        {/* Intelligence Feed */}
        <div style={glassCard()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={18} color={cs.textDim} />
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: cs.textHeading, margin: 0 }}>
                  Recent Activity Intelligence
                </h2>
             </div>
             <button style={{ background: 'none', border: 'none', color: cs.primary, fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                View All <ChevronRight size={14} />
             </button>
          </div>

          {recentCheckIns.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <p style={{ color: cs.textDim, fontSize: '14px' }}>No activity intelligence recorded yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {recentCheckIns.map((ci) => (
                <motion.div
                  key={ci.id}
                  whileHover={{ background: 'rgba(255,255,255,0.02)' }}
                  style={{
                    padding: '20px',
                    borderRadius: '16px',
                    background: cs.surface,
                    border: `1px solid ${cs.border}`,
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <TypePill type={ci.type} />
                    <span style={{ fontSize: '12px', color: cs.textMuted }}>
                      {new Date(ci.submitted_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '16px' }}>
                    {ci.adherence_score != null && (
                      <div style={{ fontSize: '13px' }}>
                        <span style={{ color: cs.textDim, marginRight: '6px' }}>Adherence</span>
                        <span style={{ color: adherenceColor(ci.adherence_score), fontWeight: 700 }}>{ci.adherence_score}%</span>
                      </div>
                    )}
                    {ci.energy_rating != null && (
                      <div style={{ fontSize: '13px' }}>
                        <span style={{ color: cs.textDim, marginRight: '6px' }}>Energy</span>
                        <span style={{ color: cs.textHeading, fontWeight: 700 }}>{ci.energy_rating}/10</span>
                      </div>
                    )}
                    {ci.focus_rating != null && (
                      <div style={{ fontSize: '13px' }}>
                        <span style={{ color: cs.textDim, marginRight: '6px' }}>Focus</span>
                        <span style={{ color: cs.textHeading, fontWeight: 700 }}>{ci.focus_rating}/10</span>
                      </div>
                    )}
                    {ci.sleep_hours != null && (
                      <div style={{ fontSize: '13px' }}>
                        <span style={{ color: cs.textDim, marginRight: '6px' }}>Sleep</span>
                        <span style={{ color: cs.textHeading, fontWeight: 700 }}>{ci.sleep_hours}h</span>
                      </div>
                    )}
                  </div>

                  {ci.ai_analysis && (
                    <div style={{ 
                      padding: '12px 16px', 
                      background: cs.bgAlt, 
                      borderRadius: '12px', 
                      fontSize: '14px', 
                      color: cs.text, 
                      lineHeight: '1.6',
                      border: `1px solid ${cs.border}`,
                      fontStyle: 'italic'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                         <Sparkles size={12} color={cs.blue} />
                         <span style={{ fontSize: '10px', color: cs.blue, fontWeight: 800, textTransform: 'uppercase' }}>AI Insight</span>
                      </div>
                      {ci.ai_analysis}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AuthLayout>
  );
}

function StatTile({ icon: Icon, label, value, color }: { icon: any, label: string, value: string, color: string }) {
  return (
    <div style={glassCard({ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px' })}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: cs.textDim }}>
        <Icon size={16} />
        <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      </div>
      <div style={{ fontSize: '24px', fontWeight: 800, color: color, letterSpacing: '-0.02em' }}>
        {value}
      </div>
    </div>
  );
}

function ProtocolCard({ icon: Icon, label, value, color }: { icon: any, label: string, value: string, color: string }) {
  return (
    <div style={{
      padding: '16px',
      borderRadius: '16px',
      background: 'rgba(255,255,255,0.02)',
      border: `1px solid ${cs.border}`,
      transition: 'all 0.2s ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <div style={{ color: color }}>
          <Icon size={14} />
        </div>
        <span style={{ fontSize: '10px', fontWeight: 800, color: cs.textDim, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      </div>
      <div style={{ fontSize: '15px', fontWeight: 700, color: cs.textHeading }}>
        {value}
      </div>
    </div>
  );
}

function TypePill({ type }: { type: string }) {
  const isMorning = type === 'morning';
  const color = isMorning ? cs.warn : cs.violet;
  const bg = isMorning ? cs.warnBg : cs.violetBg;
  const border = isMorning ? cs.warnBorder : cs.violetBorder;
  
  return (
    <span style={{
      fontSize: '10px',
      fontWeight: 800,
      padding: '4px 12px',
      borderRadius: '100px',
      background: bg,
      border: `1px solid ${border}`,
      color: color,
      textTransform: 'uppercase',
      letterSpacing: '0.05em'
    }}>
      {type}
    </span>
  );
}
