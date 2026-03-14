'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import { AuthLayout } from '../../components/layout';
import { cs, statusStyle, adherenceColor, inp, btn } from '../../lib/styles';
import { motion } from 'framer-motion';
import { 
  Users, 
  Search, 
  Clock, 
  ChevronRight,
  UserPlus,
  Mail,
  ShieldAlert,
  Activity
} from 'lucide-react';

interface Client {
  id: string;
  full_name: string;
  email: string;
  status: string;
  program_week: number;
  program_day: number;
  rolling_7d_adherence: number;
  consecutive_missed_checkins: number;
  last_checkin_at: string | null;
  intervention_flag: boolean;
  chronotype: string | null;
}

type FilterKey = 'all' | 'active' | 'paused' | 'flagged';

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    api<Client[]>('/api/clients')
      .then(setClients)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = clients.filter((c) => {
    const matchesSearch = c.full_name.toLowerCase().includes(search.toLowerCase()) || 
                         c.email.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    
    if (filter === 'active') return c.status === 'active';
    if (filter === 'paused') return c.status === 'paused';
    if (filter === 'flagged') return c.intervention_flag;
    return true;
  });

  const filterCounts: Record<FilterKey, number> = {
    all: clients.length,
    active: clients.filter((c) => c.status === 'active').length,
    paused: clients.filter((c) => c.status === 'paused').length,
    flagged: clients.filter((c) => c.intervention_flag).length,
  };

  const formatDate = (d: string | null) => {
    if (!d) return 'Never';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <AuthLayout>
      <div style={{ maxWidth: '1250px', margin: '0 auto' }}>
        
        {/* Page header */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '56px', flexWrap: 'wrap', gap: '24px' }}
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
                <Users size={12} color={cs.primary} />
                <span style={{ fontSize: '10px', fontWeight: 800, color: cs.primary, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                  Fleet Management
                </span>
              </div>
            </div>
            <h1 style={{ fontSize: '42px', fontWeight: 800, color: cs.textHeading, margin: 0, letterSpacing: '-0.04em' }}>
              Human <span style={{ color: cs.primary }}>Capital</span>.
            </h1>
            <p style={{ fontSize: '15px', color: cs.textDim, marginTop: '12px', fontWeight: 500 }}>
              Monitoring {clients.length} active cognitive streams across the infrastructure.
            </p>
          </div>
          <button 
            className="glow-border"
            style={{
              ...btn('primary', {
                padding: '16px 32px',
                borderRadius: '14px',
                fontSize: '14px',
                fontWeight: 800,
                gap: '10px',
                boxShadow: `0 8px 24px ${cs.primaryGlow}`
              })
            }}
          >
            <UserPlus size={18} strokeWidth={3} /> INITIALIZE SUBJECT
          </button>
        </motion.div>

        {/* Controls Row */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '32px',
          gap: '24px',
          flexWrap: 'wrap'
        }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: 1, minWidth: '300px' }}>
            <Search size={18} style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', color: cs.textDim, opacity: 0.8 }} />
            <input 
              type="text"
              placeholder="Search personnel by name, email or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                ...inp({
                  paddingLeft: '56px',
                  borderRadius: '16px',
                  height: '56px',
                  background: 'rgba(255,255,255,0.02)',
                  fontSize: '15px'
                })
              }}
            />
          </div>

          {/* Filter Pills */}
          <div style={{ 
            display: 'flex', 
            gap: '8px', 
            background: 'rgba(255,255,255,0.02)', 
            padding: '6px', 
            borderRadius: '16px',
            border: `1.5px solid rgba(255,255,255,0.04)`
          }}>
            {(['all', 'active', 'flagged', 'paused'] as const).map((f) => {
              const isActive = filter === f;
              const isFlagged = f === 'flagged';
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    background: isActive ? (isFlagged ? cs.danger : cs.primary) : 'transparent',
                    color: isActive ? '#000' : cs.textDim,
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    boxShadow: isActive ? (isFlagged ? `0 8px 16px ${cs.danger}40` : `0 8px 16px ${cs.primaryGlow}`) : 'none'
                  }}
                >
                  {isFlagged && <ShieldAlert size={14} strokeWidth={3} />}
                  {f === 'all' && <Users size={14} />}
                  {f === 'active' && <Activity size={14} />}
                  {f}
                  <span style={{ 
                    opacity: 0.6, 
                    fontSize: '10px', 
                    background: isActive ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.05)',
                    padding: '2px 6px',
                    borderRadius: '4px'
                  }}>{filterCounts[f]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* List Content */}
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '120px 0' }}>
            <div className="spinner" />
          </div>
        ) : filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card" style={{ padding: '100px 40px', textAlign: 'center', borderStyle: 'dashed' }}>
            <Search size={48} color={cs.textDim} opacity={0.3} style={{ marginBottom: '24px' }} />
            <h3 style={{ color: cs.textHeading, marginBottom: '8px', fontWeight: 800 }}>No Signal Matches</h3>
            <p style={{ color: cs.textDim, fontSize: '15px', fontWeight: 500 }}>Adjust your search parameters or filters to locate subject.</p>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card" 
            style={{ padding: 0, overflow: 'hidden' }}
          >
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '400px 140px 120px 240px 180px 1fr',
              padding: '20px 32px',
              borderBottom: `1.5px solid ${cs.border}`,
              background: 'rgba(255,255,255,0.02)'
            }}>
              {['Personnel Signature', 'Status', 'Temporal', 'Adherence Index', 'Last Sync', ''].map((h, i) => (
                <span key={i} style={{ fontSize: '10px', fontWeight: 900, color: cs.textDim, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                  {h}
                </span>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {filtered.map((c, i) => {
                const ss = statusStyle(c.status);
                const adhVal = Number(c.rolling_7d_adherence ?? 0);
                const adhColor = adherenceColor(adhVal);

                return (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => router.push(`/clients/${c.id}`)}
                    className="table-row-hover"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '400px 140px 120px 240px 180px 1fr',
                      padding: '22px 32px',
                      alignItems: 'center',
                      cursor: 'pointer',
                      borderBottom: i < filtered.length - 1 ? `1.5px solid ${cs.borderLight}` : 'none',
                      transition: 'background 0.2s ease',
                    }}
                  >
                    {/* Client Info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '14px',
                        background: `linear-gradient(135deg, ${cs.surfaceRaised}, rgba(255,255,255,0.05))`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px',
                        fontWeight: 900,
                        color: cs.primary,
                        position: 'relative',
                        border: `1.5px solid rgba(255,255,255,0.05)`
                      }}>
                        {c.full_name.charAt(0).toUpperCase()}
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
                        <div style={{ fontSize: '16px', fontWeight: 800, color: cs.textHeading, letterSpacing: '-0.02em' }}>{c.full_name}</div>
                        <div style={{ fontSize: '12px', color: cs.textDim, display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                           <Mail size={12} opacity={0.6} /> {c.email}
                        </div>
                      </div>
                    </div>

                    {/* Status badge */}
                    <div>
                      <span style={{
                        padding: '5px 14px',
                        borderRadius: '100px',
                        fontSize: '10px',
                        fontWeight: 900,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        background: ss.bg,
                        color: ss.fg,
                        border: `1.5px solid ${ss.border}`,
                      }}>
                        {c.status}
                      </span>
                    </div>

                    {/* Program Progress */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                       <Clock size={14} color={cs.textDim} />
                       <span style={{ fontSize: '14px', fontWeight: 800, color: cs.textHeading }}>W{c.program_week} <span style={{ color: cs.textDim, fontWeight: 500, marginLeft: '2px' }}>D{c.program_day}</span></span>
                    </div>

                    {/* Adherence */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingRight: '40px' }}>
                      <div style={{ flex: 1, height: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.02)' }}>
                        <motion.div 
                           initial={{ width: 0 }}
                           animate={{ width: `${adhVal}%` }}
                           transition={{ duration: 1, ease: 'easeOut', delay: 0.5 }}
                           style={{ height: '100%', width: `${adhVal}%`, background: adhColor, boxShadow: `0 0 10px ${adhColor}30` }} 
                        />
                      </div>
                      <span style={{ fontSize: '14px', fontWeight: 900, color: adhColor, minWidth: '40px' }}>{adhVal}%</span>
                    </div>

                    {/* Last Activity */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Clock size={15} color={cs.textDim} opacity={0.7} />
                      <span style={{ fontSize: '14px', color: cs.textDim, fontWeight: 600 }}>{formatDate(c.last_checkin_at)}</span>
                    </div>

                    {/* Action */}
                    <div style={{ textAlign: 'right', paddingRight: '12px' }}>
                       <div style={{ 
                         width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.02)', 
                         display: 'flex', alignItems: 'center', justifyContent: 'center', color: cs.textDim,
                         transition: 'all 0.2s ease'
                       }}>
                          <ChevronRight size={18} />
                       </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>
    </AuthLayout>
  );
}
