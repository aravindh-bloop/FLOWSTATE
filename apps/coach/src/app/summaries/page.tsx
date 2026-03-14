'use client';

import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { AuthLayout } from '../../components/layout';
import { cs, font, inp, btn, adherenceColor } from '../../lib/styles';
import { motion } from 'framer-motion';
import { 
  Users, 
  ChevronDown, 
  ChevronUp,
  Sparkles, 
  Edit3, 
  Activity, 
  Zap, 
  Moon, 
  Target, 
  CheckCircle2, 
  Brain, 
  BarChart3 
} from 'lucide-react';

interface Client {
  id: string;
  full_name: string;
}

interface Summary {
  id: string;
  client_id: string;
  client_name?: string;
  week_number: number;
  total_checkins: number;
  missed_checkins: number;
  avg_adherence: number;
  adherence_avg?: number;
  avg_energy: number;
  energy_avg?: number;
  avg_focus: number;
  avg_sleep_hours: number;
  sleep_avg?: number;
  interventions_sent: number;
  ai_narrative: string | null;
  coach_notes: string | null;
  generated_at: string;
  created_at?: string;
}

export default function SummariesPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [expandedNarrative, setExpandedNarrative] = useState<string | null>(null);

  useEffect(() => {
    api<Client[]>('/api/clients').then(setClients).catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedClient) { setSummaries([]); return; }
    setLoading(true);
    api<Summary[]>(`/api/clients/${selectedClient}/summaries`)
      .then(setSummaries)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedClient]);

  const handleSaveNotes = async (id: string) => {
    try {
      await api(`/api/summaries/${id}/notes`, { method: 'PATCH', body: JSON.stringify({ coach_notes: editNotes }) });
      setSummaries((prev) => prev.map((s) => (s.id === id ? { ...s, coach_notes: editNotes } : s)));
      setEditingId(null);
    } catch (err) { console.error(err); }
  };

  return (
    <AuthLayout>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        {/* Page header */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: '56px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <div style={{ 
              padding: '4px 10px', 
              borderRadius: '100px', 
              background: 'rgba(10, 132, 255, 0.1)', 
              border: `1.5px solid rgba(10, 132, 255, 0.2)`,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Brain size={12} color="#0a84ff" />
              <span style={{ fontSize: '10px', fontWeight: 800, color: '#0a84ff', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                Neural Analysis
              </span>
            </div>
          </div>
          <h1 style={{ fontSize: '42px', fontWeight: 800, color: cs.textHeading, margin: 0, letterSpacing: '-0.04em' }}>
            Biological <span style={{ color: cs.primary }}>Synthetics</span>.
          </h1>
          <p style={{ fontSize: '15px', color: cs.textDim, marginTop: '12px', fontWeight: 500 }}>
            Weekly intelligence reports derived from high-frequency biometric data streams.
          </p>
        </motion.div>

        {/* Client selector */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card glow-border premium-blur"
          style={{ 
            marginBottom: '48px',
            padding: '24px 32px',
            display: 'flex',
            alignItems: 'center',
            gap: '32px'
          }}
        >
          <div style={{ flex: 1 }}>
            <label className="float-label">Target Subject</label>
            <div style={{ position: 'relative' }}>
              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                style={{
                  ...inp({
                    cursor: 'pointer',
                    appearance: 'none',
                    paddingRight: '44px',
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: '12px',
                    height: '56px'
                  })
                }}
              >
                <option value="">Select subject for deep analysis...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.full_name}</option>
                ))}
              </select>
              <div style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: cs.textDim }}>
                 <ChevronDown size={20} />
              </div>
            </div>
          </div>
          <div style={{ width: '1px', height: '40px', background: 'rgba(255,255,255,0.05)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
             <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '10px', fontWeight: 800, color: cs.textDim, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Fleet Status</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: cs.primary }}>OPTIMAL</div>
             </div>
             <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(223, 255, 0, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Activity size={20} color={cs.primary} />
             </div>
          </div>
        </motion.div>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '120px 0' }}>
            <div className="spinner" />
          </div>
        ) : summaries.length === 0 && selectedClient ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card" style={{ padding: '80px 40px', textAlign: 'center', borderStyle: 'dashed' }}>
            <BarChart3 size={48} color={cs.textDim} opacity={0.3} style={{ marginBottom: '24px' }} />
            <h3 style={{ color: cs.textHeading, marginBottom: '8px', fontWeight: 800 }}>No Signal Archive</h3>
            <p style={{ color: cs.textDim, fontSize: '15px', fontWeight: 500 }}>No synthesized reports detected for this subject identity.</p>
          </motion.div>
        ) : !selectedClient ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card" style={{ padding: '100px 40px', textAlign: 'center' }}>
            <div style={{ color: '#0a84ff', marginBottom: '32px', display: 'flex', justifyContent: 'center', opacity: 0.2 }}>
               <Users size={64} strokeWidth={1} />
            </div>
            <h3 style={{ color: cs.textHeading, marginBottom: '12px', fontWeight: 800, fontSize: '24px', letterSpacing: '-0.02em' }}>Intelligence Terminal</h3>
            <p style={{ color: cs.textDim, fontSize: '16px', fontWeight: 500, maxWidth: '500px', margin: '0 auto' }}>Select a subject from the interface to initialize deep-scan performance summaries.</p>
          </motion.div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {summaries.map((s, idx) => {
              const adherence = s.adherence_avg ?? s.avg_adherence ?? 0;
              const energy = s.energy_avg ?? s.avg_energy;
              const sleep = s.sleep_avg ?? s.avg_sleep_hours;
              const focus = s.avg_focus;
              const isNarrativeExpanded = expandedNarrative === s.id;
              const narrative = s.ai_narrative;

              return (
                <motion.div 
                  key={s.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="glass-card card-beam glow-border"
                  style={{ padding: '0', overflow: 'hidden' }}
                >
                  <div style={{ padding: '40px' }}>
                    {/* Card Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '36px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                         <div style={{ 
                           width: '56px', height: '56px', borderRadius: '16px', 
                           background: `linear-gradient(135deg, rgba(223, 255, 0, 0.1), rgba(10, 132, 255, 0.1))`, 
                           display: 'flex', alignItems: 'center', justifyContent: 'center',
                           border: `1.5px solid rgba(255,255,255,0.05)`,
                           boxShadow: `0 10px 20px rgba(0,0,0,0.2)`
                         }}>
                            <span style={{ fontSize: '11px', fontWeight: 900, color: cs.primary, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                              WK{s.week_number}
                            </span>
                         </div>
                         <div>
                          <h2 style={{ fontSize: '22px', fontWeight: 800, color: cs.textHeading, margin: 0, letterSpacing: '-0.02em' }}>
                            Performance Synthesis
                          </h2>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
                            <span style={{ fontSize: '13px', color: cs.textDim, fontWeight: 500 }}>Temporal Delta:</span>
                            <span style={{ fontSize: '13px', color: cs.primary, fontWeight: 700 }}>
                              {new Date(s.generated_at ?? s.created_at ?? '').toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                            </span>
                          </div>
                         </div>
                      </div>
                      <div className="hidden sm:block">
                        <div style={{ 
                          padding: '6px 14px', 
                          borderRadius: '10px', 
                          background: 'rgba(255,255,255,0.03)', 
                          border: `1px solid rgba(255,255,255,0.05)`,
                          fontSize: '11px', 
                          color: cs.textDim, 
                          fontWeight: 700,
                          letterSpacing: '0.05em'
                        }}>
                          ID: {s.id.split('-')[0].toUpperCase()}
                        </div>
                      </div>
                    </div>

                    {/* Metrics Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '40px' }}>
                      <MetricCard icon={Activity} label="Adherence Index" value={`${adherence}%`} color={adherenceColor(adherence)} />
                      <MetricCard icon={Zap} label="Average Vitality" value={energy != null ? `${energy}/10` : 'N/A'} color={cs.primary} />
                      <MetricCard icon={Target} label="Cognitive Focus" value={focus != null ? `${focus}/10` : 'N/A'} color={cs.violet} />
                      <MetricCard icon={Moon} label="Regeneration" value={sleep != null ? `${sleep}h` : 'N/A'} color="#10b981" />
                      <MetricCard icon={CheckCircle2} label="Pulse Samples" value={`${s.total_checkins}`} color={cs.textHeading} />
                    </div>

                    {/* AI Narrative Section */}
                    {narrative && (
                      <div style={{
                        background: 'rgba(10, 132, 255, 0.04)',
                        border: `1.5px solid rgba(10, 132, 255, 0.15)`,
                        borderRadius: '20px',
                        padding: '28px 32px',
                        marginBottom: '40px',
                        position: 'relative',
                        overflow: 'hidden'
                      }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'rgba(10, 132, 255, 0.4)' }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                          <Sparkles size={18} color="#0a84ff" />
                          <span style={{ fontSize: '11px', fontWeight: 900, color: '#0a84ff', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                            Synthesized Intelligence Narrative
                          </span>
                        </div>
                        <p style={{ 
                          fontSize: '15px', 
                          lineHeight: '1.8', 
                          color: cs.textHeading, 
                          fontFamily: font, 
                          margin: 0,
                          fontWeight: 500,
                          opacity: 0.95,
                        }}>
                          {isNarrativeExpanded ? narrative : narrative.slice(0, 350) + (narrative.length > 350 ? '...' : '')}
                        </p>
                        {narrative.length > 350 && (
                          <button
                            onClick={() => setExpandedNarrative(isNarrativeExpanded ? null : s.id)}
                            style={{
                              marginTop: '20px',
                              background: 'rgba(10, 132, 255, 0.1)',
                              border: `1px solid rgba(10, 132, 255, 0.2)`,
                              color: '#0a84ff',
                              padding: '8px 16px',
                              borderRadius: '10px',
                              fontSize: '13px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(10, 132, 255, 0.15)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(10, 132, 255, 0.1)'; }}
                          >
                            {isNarrativeExpanded ? <>Collapse Scan <ChevronUp size={14} /></> : <>Initialize Deep Scan <ChevronDown size={14} /></>}
                          </button>
                        )}
                      </div>
                    )}

                    {/* Coach Notes */}
                    <div style={{ background: 'rgba(255,255,255,0.015)', borderRadius: '20px', padding: '32px', border: `1.5px solid rgba(255,255,255,0.04)` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <Edit3 size={18} color={cs.primary} />
                          <span style={{ fontSize: '11px', fontWeight: 900, color: cs.primary, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                            Operator Observation
                          </span>
                        </div>
                        {editingId !== s.id && (
                          <button
                            onClick={() => { setEditingId(s.id); setEditNotes(s.coach_notes ?? ''); }}
                            className="glow-border"
                            style={{
                              background: 'rgba(255,255,255,0.04)',
                              border: `1px solid rgba(255,255,255,0.06)`,
                              color: cs.textHeading,
                              padding: '10px 18px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: 800,
                              cursor: 'pointer',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em'
                            }}
                          >
                            {s.coach_notes ? 'Modify Logs' : 'Append Protocol Notes'}
                          </button>
                        )}
                      </div>

                      {editingId === s.id ? (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          <textarea
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            rows={5}
                            placeholder="Document biological observations and corrective protocols..."
                            style={inp({ 
                              resize: 'none', 
                              fontSize: '15px', 
                              lineHeight: '1.7',
                              background: 'rgba(0,0,0,0.2)',
                              borderRadius: '16px',
                              padding: '20px'
                            })}
                          />
                          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => setEditingId(null)}
                              style={btn('secondary', {
                                padding: '12px 24px',
                                borderRadius: '12px',
                                fontSize: '13px',
                                fontWeight: 600
                              })}
                            >
                              Discard
                            </button>
                            <button
                              onClick={() => handleSaveNotes(s.id)}
                              style={btn('primary', {
                                padding: '12px 32px',
                                borderRadius: '12px',
                                fontSize: '13px',
                                fontWeight: 800
                              })}
                            >
                              Commit to Log
                            </button>
                          </div>
                        </motion.div>
                      ) : s.coach_notes ? (
                        <p style={{ fontSize: '15px', lineHeight: '1.8', color: cs.textHeading, margin: 0, fontWeight: 500 }}>
                          {s.coach_notes}
                        </p>
                      ) : (
                        <p style={{ fontSize: '14px', color: cs.textDim, fontStyle: 'italic', margin: 0, fontWeight: 500 }}>
                          No operator observations recorded for this temporal phase.
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </AuthLayout>
  );
}

function MetricCard({ icon: Icon, label, value, color }: { icon: any, label: string; value: string; color?: string }) {
  return (
    <div className="glass-card" style={{
      borderRadius: '16px',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      background: 'rgba(255,255,255,0.015)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: cs.textDim }}>
        <Icon size={16} color={color ?? cs.textDim} />
        <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
      </div>
      <div style={{ fontSize: '24px', fontWeight: 900, color: color ?? cs.textHeading, letterSpacing: '-0.04em' }}>
        {value}
      </div>
    </div>
  );
}
