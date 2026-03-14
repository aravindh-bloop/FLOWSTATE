'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../lib/api';
import { AuthLayout } from '../components/layout';
import { useSession } from '../lib/session';
import { cs, font, adherenceColor, statusStyle, inp } from '../lib/styles';
import { motion } from 'framer-motion';
import { RotatingCards } from '../components/rotating-cards';
import { 
  Users, 
  Flag, 
  Search, 
  Zap,
  TrendingUp,
  Clock,
  ArrowRight,
  UserCheck,
  Bell
} from 'lucide-react';

interface DashboardData {
  clients: Array<{
    id: string;
    full_name: string;
    status: string;
    program_week: number;
    rolling_7d_adherence: number;
    consecutive_missed_checkins: number;
    last_checkin_at: string | null;
    intervention_flag: boolean;
    email: string;
    pending_interventions: number;
  }>;
  stats: {
    active_clients: number;
    paused_clients: number;
    flagged_clients: number;
    avg_adherence: number;
  };
  pending_interventions: number;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

export default function CoachDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();
  const { user } = useSession();

  useEffect(() => {
    api<DashboardData>('/api/dashboard/coach')
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <AuthLayout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '120px 0' }}>
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
        <div style={{ color: cs.danger, fontSize: '14px', fontFamily: font, padding: '40px', textAlign: 'center' }}>
          Failed to load dashboard
        </div>
      </AuthLayout>
    );
  }

  const firstName = user?.name?.split(' ')[0] ?? 'Coach';

  const statCards = [
    { label: 'Active Personnel', value: data.stats.active_clients, color: cs.primary, icon: Users, trend: 'Stable' },
    { label: 'Fleet Adherence', value: `${data.stats.avg_adherence ?? 0}%`, color: cs.success, icon: TrendingUp, trend: 'Optimal' },
    { label: 'System Flags', value: data.stats.flagged_clients, color: cs.danger, icon: Flag, trend: 'Action Required' },
    { label: 'Pending Comms', value: data.pending_interventions, color: cs.violet, icon: Bell, trend: 'Priority High' },
  ];

  const filteredClients = data.clients.filter(c => 
    c.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedClients = [...filteredClients].sort((a, b) => 
    (a.intervention_flag ? -1 : 1) - (b.intervention_flag ? -1 : 1) ||
    Number(a.rolling_7d_adherence ?? 0) - Number(b.rolling_7d_adherence ?? 0)
  );

  return (
    <AuthLayout>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        
        {/* Hero Section with Visualization */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '40px', marginBottom: '64px', alignItems: 'center' }}>
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <div style={{ 
                padding: '4px 12px', 
                borderRadius: '100px', 
                background: cs.primarySoft, 
                border: `1px solid ${cs.primary}30`,
                fontSize: '11px',
                fontWeight: 800,
                color: cs.primary,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                boxShadow: `0 0 20px ${cs.primaryGlow}`
              }}>
                <span className="animate-pulse" style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: cs.primary, marginRight: 8, verticalAlign: 'middle' }} />
                System Active
              </div>
              <span style={{ fontSize: '12px', color: cs.textDim, fontWeight: 600, letterSpacing: '0.05em' }}>{formatDate()}</span>
            </div>
            
            <h1 style={{
              fontSize: 'clamp(32px, 5vw, 56px)',
              fontWeight: 800,
              color: cs.textHeading,
              margin: 0,
              letterSpacing: '-0.04em',
              lineHeight: 1.1
            }}>
              {getGreeting()}, <span style={{ 
                backgroundImage: cs.gradient,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                fontWeight: 800
              }}>Coach {firstName}.</span>
            </h1>
            
            <p style={{
               fontSize: '18px',
               color: cs.text,
               marginTop: '20px',
               maxWidth: '600px',
               lineHeight: 1.6,
               fontWeight: 400
            }}>
              Personnel readiness at <span style={{ color: cs.primary, fontWeight: 700 }}>{data.stats.avg_adherence}%</span>. 
              Review <span style={{ color: cs.danger, fontWeight: 700 }}>{data.stats.flagged_clients} protocol anomalies</span> detected by the neural engine.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="hidden lg:block"
          >
            <RotatingCards />
          </motion.div>
        </div>

        {/* Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '24px',
          marginBottom: '64px'
        }}>
          {statCards.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              whileHover={{ y: -5 }}
              className="glass-card card-beam stat-shimmer glow-border"
              style={{
                padding: '28px',
                display: 'flex',
                flexDirection: 'column',
                gap: '24px',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: `${s.color}15`,
                  color: s.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: `1.5px solid ${s.color}25`,
                  boxShadow: `0 0 15px ${s.color}10`
                }}>
                  <s.icon size={22} />
                </div>
                <div style={{
                   fontSize: '10px',
                   fontWeight: 800,
                   color: s.color,
                   textTransform: 'uppercase',
                   letterSpacing: '0.1em',
                   background: `${s.color}10`,
                   padding: '4px 10px',
                   borderRadius: '6px',
                   border: `1px solid ${s.color}20`
                }}>
                   {s.trend}
                </div>
              </div>
              
              <div>
                <div style={{
                  fontSize: '42px',
                  fontWeight: 900,
                  color: cs.textHeading,
                  letterSpacing: '-0.05em',
                  lineHeight: '1',
                }}>
                  {s.value}
                </div>
                <div className="float-label" style={{ marginTop: '12px' }}>
                  {s.label}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Client List Section */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="glass-card"
          style={{ padding: 0, overflow: 'hidden' }}
        >
          <div style={{
            padding: '32px 40px',
            borderBottom: `1px solid ${cs.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '24px',
            flexWrap: 'wrap',
            background: 'rgba(255,255,255,0.015)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ 
                padding: '10px', 
                borderRadius: '12px', 
                background: cs.primarySoft, 
                color: cs.primary,
                border: `1.5px solid ${cs.primary}20` 
              }}>
                 <UserCheck size={22} />
              </div>
              <div>
                <h2 style={{ fontSize: '22px', fontWeight: 800, color: cs.textHeading, margin: 0, letterSpacing: '-0.03em' }}>
                  Human Capital Interface
                </h2>
                <p style={{ fontSize: '13px', color: cs.textDim, margin: 0, fontWeight: 500 }}>
                  Monitoring {data.stats.active_clients} live biological streams
                </p>
              </div>
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
              <Search 
                size={18} 
                style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', color: cs.textDim }} 
              />
              <input 
                type="text" 
                placeholder="Search metrics by name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  ...inp({
                    paddingLeft: '50px',
                    paddingRight: '18px',
                    paddingTop: '16px',
                    paddingBottom: '16px',
                    background: 'rgba(255,255,255,0.02)',
                    borderColor: 'rgba(255,255,255,0.05)',
                    borderRadius: '14px',
                    fontSize: '15px'
                  })
                }}
              />
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.01)' }}>
                  <th style={thStyle}>Subject Metadata</th>
                  <th style={thStyle}>Phase</th>
                  <th style={thStyle}>Adherence Index</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Signal Pulse</th>
                  <th style={thStyle}></th>
                </tr>
              </thead>
              <tbody>
                {sortedClients.map((c, i) => {
                  const adhVal = Number(c.rolling_7d_adherence ?? 0);
                  const adhColor = adherenceColor(adhVal);
                  const st = statusStyle(c.status);

                  return (
                    <motion.tr
                      key={c.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.8 + (i * 0.05) }}
                      onClick={() => router.push(`/clients/${c.id}`)}
                      className="table-row-hover"
                      style={{ cursor: 'pointer', borderBottom: i < sortedClients.length - 1 ? `1px solid ${cs.borderLight}` : 'none' }}
                    >
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '18px', padding: '12px 0' }}>
                          <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '14px',
                            background: `linear-gradient(135deg, ${cs.surfaceRaised}, rgba(255,255,255,0.05))`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '16px',
                            fontWeight: 800,
                            color: cs.primary,
                            position: 'relative',
                            border: `1.5px solid rgba(255,255,255,0.05)`
                          }}>
                            {getInitials(c.full_name)}
                            {c.intervention_flag && (
                              <div style={{
                                position: 'absolute',
                                top: '-5px',
                                right: '-5px',
                                width: '14px',
                                height: '14px',
                                borderRadius: '50%',
                                background: cs.danger,
                                border: `3px solid #050508`,
                                boxShadow: `0 0 10px ${cs.danger}50`
                              }} />
                            )}
                          </div>
                          <div>
                            <div style={{ color: cs.textHeading, fontWeight: 700, fontSize: '16px' }}>
                              {c.full_name}
                            </div>
                            <div style={{ color: cs.textDim, fontSize: '13px', fontWeight: 500 }}>
                              {c.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                           <Clock size={16} color={cs.textDim} />
                           <span style={{ fontSize: '15px', fontWeight: 800, color: cs.textHeading }}>W{c.program_week}</span>
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: '160px' }}>
                          <div style={{ flex: 1, height: '8px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.02)' }}>
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(adhVal, 100)}%` }}
                              transition={{ duration: 1.5, ease: 'easeOut', delay: 1.2 }}
                              style={{ 
                                height: '100%', 
                                background: `linear-gradient(90deg, ${adhColor}aa, ${adhColor})`,
                                boxShadow: `0 0 10px ${adhColor}30`
                              }} 
                            />
                          </div>
                          <span style={{ color: adhColor, fontWeight: 800, fontSize: '15px', width: '40px' }}>{adhVal.toFixed(0)}%</span>
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <div style={{
                          padding: '5px 14px',
                          borderRadius: '100px',
                          fontSize: '11px',
                          fontWeight: 800,
                          background: st.bg,
                          color: st.fg,
                          border: `1.5px solid ${st.border}`,
                          width: 'fit-content',
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em'
                        }}>
                          {c.status}
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ fontSize: '14px', color: cs.textDim, fontWeight: 600 }}>{timeAgo(c.last_checkin_at)}</span>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        <div style={{ color: cs.textDim }}>
                           <ArrowRight size={20} />
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </AuthLayout>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '18px 40px',
  color: cs.textDim,
  fontSize: '11px',
  fontWeight: 800,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  borderBottom: `1.5px solid ${cs.border}`,
};

const tdStyle: React.CSSProperties = {
  padding: '16px 40px',
};
