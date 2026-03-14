'use client';

import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { AuthLayout } from '../../components/layout';
import { cs, inp, btn, statusStyle } from '../../lib/styles';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, 
  Check, 
  X, 
  Edit3, 
  Plus, 
  Clock, 
  ShieldAlert,
  Send,
  MessageSquare
} from 'lucide-react';

interface Intervention {
  id: string;
  client_id: string;
  client_name: string;
  trigger_condition: string;
  trigger_reason?: string;
  type?: string;
  draft_message: string;
  final_message: string | null;
  status: string;
  template_name: string | null;
  created_at: string;
}

export default function InterventionsPage() {
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMsg, setEditMsg] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [manualClientId, setManualClientId] = useState('');
  const [manualMsg, setManualMsg] = useState('');
  const [clients, setClients] = useState<{ id: string; full_name: string }[]>([]);

  const load = () => {
    api<Intervention[]>('/api/interventions')
      .then(setInterventions)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    api<{ id: string; full_name: string }[]>('/api/clients').then(setClients).catch(() => {});
  }, []);

  const handleApprove = async (id: string) => {
    setProcessing(id);
    try { await api(`/api/interventions/${id}/approve`, { method: 'PATCH' }); load(); }
    catch (err) { console.error(err); }
    finally { setProcessing(null); }
  };

  const handleDismiss = async (id: string) => {
    setProcessing(id);
    try { await api(`/api/interventions/${id}/dismiss`, { method: 'PATCH' }); load(); }
    catch (err) { console.error(err); }
    finally { setProcessing(null); }
  };

  const handleEdit = async (id: string) => {
    setProcessing(id);
    try {
      await api(`/api/interventions/${id}/edit`, { method: 'PATCH', body: JSON.stringify({ final_message: editMsg }) });
      setEditingId(null); load();
    } catch (err) { console.error(err); }
    finally { setProcessing(null); }
  };

  const handleManualCreate = async () => {
    if (!manualClientId || !manualMsg) return;
    try {
      await api('/api/interventions/manual', { method: 'POST', body: JSON.stringify({ client_id: manualClientId, draft_message: manualMsg }) });
      setShowManual(false); setManualClientId(''); setManualMsg(''); load();
    } catch (err) { console.error(err); }
  };

  // Group interventions: pending first, then everything else
  const pending = interventions.filter((iv) => iv.status === 'pending');
  const resolved = interventions.filter((iv) => iv.status !== 'pending');

  return (
    <AuthLayout>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '48px', gap: '24px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
               <div style={{ 
                 padding: '4px 10px', 
                 borderRadius: '100px', 
                 background: 'rgba(255, 69, 58, 0.1)', 
                 border: `1.5px solid rgba(255, 69, 58, 0.2)`,
                 display: 'flex',
                 alignItems: 'center',
                 gap: '6px'
               }}>
                 <ShieldAlert size={12} color="#ff453a" />
                 <span style={{ fontSize: '10px', fontWeight: 800, color: '#ff453a', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                   Action Required
                 </span>
               </div>
            </div>
            <h1 style={{ fontSize: '42px', fontWeight: 800, color: cs.textHeading, margin: 0, letterSpacing: '-0.04em' }}>
              Bio-Signal <span style={{ color: cs.primary }}>Interventions</span>.
            </h1>
            <p style={{ fontSize: '15px', color: cs.textDim, marginTop: '12px', fontWeight: 500 }}>
              System-generated corrective protocols based on personnel bio-adherence data.
            </p>
          </div>
          <button
            onClick={() => setShowManual(!showManual)}
            className="glow-border"
            style={{
              ...btn('primary', {
                gap: '10px',
                borderRadius: '14px',
                padding: '14px 24px',
                fontSize: '13px',
                fontWeight: 800,
                letterSpacing: '0.05em',
                textTransform: 'uppercase' as const,
                boxShadow: `0 8px 24px ${cs.primaryGlow}`
              })
            }}
          >
            <Plus size={18} strokeWidth={3} />
            Direct Interface
          </button>
        </div>

        {/* Manual intervention form */}
        <AnimatePresence>
          {showManual && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="glass-card glow-border premium-blur"
              style={{ marginBottom: '32px', padding: '32px', position: 'relative' }}
            >
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: cs.textHeading, margin: '0 0 24px 0', letterSpacing: '-0.02em' }}>
                Create Direct Intervention
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
                <div>
                  <label className="float-label">Target Personnel</label>
                  <select
                    value={manualClientId}
                    onChange={(e) => setManualClientId(e.target.value)}
                    style={{
                      ...inp({ borderRadius: '12px', height: '54px' }),
                      cursor: 'pointer'
                    }}
                  >
                    <option value="">Select subject...</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.full_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="float-label">Message Payload</label>
                  <textarea
                    value={manualMsg}
                    onChange={(e) => setManualMsg(e.target.value)}
                    rows={2}
                    placeholder="Type protocol instructions..."
                    style={inp({ resize: 'none' as const, borderRadius: '12px', paddingTop: '16px' })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowManual(false)}
                  style={btn('secondary', { borderRadius: '12px', padding: '12px 24px', fontSize: '13px', fontWeight: 600 })}
                >
                  Terminate
                </button>
                <button
                  onClick={handleManualCreate}
                  style={btn('primary', { borderRadius: '12px', padding: '12px 32px', fontSize: '13px', fontWeight: 800 })}
                >
                  Deploy
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '120px 0' }}>
            <div className="spinner" />
          </div>
        ) : interventions.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-card" 
            style={{ padding: '100px 40px', textAlign: 'center' as const, borderStyle: 'dashed' }}
          >
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              background: 'rgba(255,255,255,0.03)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
              border: `1px solid ${cs.border}`
            }}>
              <Check size={32} color={cs.textDim} opacity={0.5} />
            </div>
            <p style={{ fontSize: '16px', color: cs.textDim, fontWeight: 500 }}>
              All biological systems within optimal parameters. No interventions queued.
            </p>
          </motion.div>
        ) : (
          <>
            {/* Pending section */}
            {pending.length > 0 && (
              <section style={{ marginBottom: '48px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                  <h2 style={{ fontSize: '14px', fontWeight: 800, color: cs.textHeading, textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
                    Active Anomalies
                  </h2>
                  <div style={{
                    padding: '2px 10px',
                    borderRadius: '100px',
                    fontSize: '11px',
                    fontWeight: 900,
                    background: cs.danger,
                    color: '#000',
                    boxShadow: `0 0 15px ${cs.danger}40`
                  }}>
                    {pending.length}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '20px' }}>
                  {pending.map((iv, idx) => (
                    <InterventionCard
                      key={iv.id}
                      iv={iv}
                      idx={idx}
                      editingId={editingId}
                      editMsg={editMsg}
                      processing={processing}
                      onApprove={handleApprove}
                      onDismiss={handleDismiss}
                      onEdit={handleEdit}
                      onStartEdit={(id: string, msg: string) => { setEditingId(id); setEditMsg(msg); }}
                      onCancelEdit={() => setEditingId(null)}
                      onEditMsgChange={setEditMsg}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Resolved section */}
            {resolved.length > 0 && (
              <section>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                  <h2 style={{ fontSize: '14px', fontWeight: 800, color: cs.textDim, textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
                    Protocol History
                  </h2>
                  <span style={{ fontSize: '12px', color: cs.textDim, fontWeight: 600 }}>{resolved.length} ENTRIES</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '16px' }}>
                  {resolved.map((iv, idx) => (
                    <InterventionCard
                      key={iv.id}
                      iv={iv}
                      idx={idx}
                      editingId={editingId}
                      editMsg={editMsg}
                      processing={processing}
                      onApprove={handleApprove}
                      onDismiss={handleDismiss}
                      onEdit={handleEdit}
                      onStartEdit={(id: string, msg: string) => { setEditingId(id); setEditMsg(msg); }}
                      onCancelEdit={() => setEditingId(null)}
                      onEditMsgChange={setEditMsg}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </AuthLayout>
  );
}

function InterventionCard({
  iv,
  idx,
  editingId,
  editMsg,
  processing,
  onApprove,
  onDismiss,
  onEdit,
  onStartEdit,
  onCancelEdit,
  onEditMsgChange,
}: any) {
  const isEditing = editingId === iv.id;
  const isPending = iv.status === 'pending';
  const trigger = iv.trigger_reason ?? iv.trigger_condition;
  const s = statusStyle(iv.status);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.08 }}
      className={`glass-card card-beam ${isPending ? 'glow-border premium-blur' : ''}`}
      style={{ 
        padding: 0, 
        position: 'relative',
        background: isPending ? 'rgba(255, 69, 58, 0.02)' : 'rgba(255,255,255,0.01)',
        borderColor: isPending ? 'rgba(255, 69, 58, 0.15)' : 'rgba(255,255,255,0.05)'
      }}
    >
      <div style={{ padding: '28px 32px' }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: 0 }}>
            {/* Subject Identity */}
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: isPending ? 'rgba(255, 69, 58, 0.1)' : cs.surfaceRaised,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '15px',
              fontWeight: 900,
              color: isPending ? '#ff453a' : cs.textDim,
              border: `1px solid ${isPending ? 'rgba(255, 69, 58, 0.2)' : 'rgba(255,255,255,0.05)'}`,
              flexShrink: 0,
            }}>
              {iv.client_name.charAt(0)}
            </div>

            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '16px', fontWeight: 800, color: cs.textHeading, letterSpacing: '-0.01em' }}>
                  {iv.client_name}
                </span>
                <span style={{
                  padding: '3px 10px',
                  borderRadius: '100px',
                  fontSize: '10px',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  background: s.bg,
                  color: s.fg,
                  border: `1px solid ${s.border}`,
                }}>
                  {iv.status}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                <AlertTriangle size={14} color={isPending ? '#ff453a' : cs.textDim} opacity={0.7} />
                <span style={{ fontSize: '13px', color: cs.textDim, fontWeight: 500 }}>
                  {trigger}
                </span>
                {iv.type && (
                  <span style={{ fontSize: '11px', color: cs.primary, fontWeight: 700, padding: '0 8px', borderLeft: `1px solid ${cs.border}` }}>
                    {iv.type.toUpperCase()}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: cs.textDim, fontWeight: 600 }}>
            <Clock size={12} />
            {new Date(iv.created_at).toLocaleDateString()}
          </div>
        </div>

        {/* Message body */}
        <div style={{ position: 'relative', marginBottom: '24px' }}>
          {isEditing ? (
            <div className="glass-card" style={{ padding: '20px', background: 'rgba(0,0,0,0.2)', borderColor: cs.primary }}>
              <textarea
                value={editMsg}
                onChange={(e) => onEditMsgChange(e.target.value)}
                rows={4}
                autoFocus
                style={{
                  ...inp({ resize: 'none' as const, fontSize: '14px', lineHeight: '1.6' }),
                  background: 'transparent',
                  border: 'none',
                  padding: 0
                }}
              />
              <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'flex-end' }}>
                <button
                  onClick={onCancelEdit}
                  style={btn('secondary', { padding: '8px 20px', borderRadius: '10px', fontSize: '12px' })}
                >
                  Discard
                </button>
                <button
                  onClick={() => onEdit(iv.id)}
                  disabled={processing === iv.id}
                  style={btn('primary', { padding: '8px 24px', borderRadius: '10px', fontSize: '12px', fontWeight: 800 })}
                >
                  {processing === iv.id ? 'Saving...' : 'Commit Changes'}
                </button>
              </div>
            </div>
          ) : (
            <div style={{
              fontSize: '15px',
              lineHeight: '1.7',
              color: cs.textHeading,
              fontWeight: 400,
              padding: '20px 24px',
              background: 'rgba(255,255,255,0.02)',
              borderRadius: '16px',
              border: `1.2px solid rgba(255,255,255,0.04)`,
              position: 'relative',
              overflow: 'hidden'
            }}>
              <MessageSquare size={16} style={{ position: 'absolute', right: '16px', top: '16px', opacity: 0.1 }} />
              {iv.final_message ?? iv.draft_message}
            </div>
          )}
        </div>

        {/* Footer row: actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {isPending && !isEditing ? (
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => onApprove(iv.id)}
                disabled={processing === iv.id}
                style={{
                  padding: '10px 24px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  background: cs.primary,
                  color: '#000',
                  border: 'none',
                  boxShadow: `0 4px 12px ${cs.primaryGlow}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <Send size={14} strokeWidth={2.5} /> Deploy Protocol
              </button>
              <button
                onClick={() => onStartEdit(iv.id, iv.final_message ?? iv.draft_message)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: 'rgba(255,255,255,0.04)',
                  color: cs.textHeading,
                  border: `1px solid rgba(255,255,255,0.05)`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
              >
                <Edit3 size={14} /> Adjust
              </button>
              <button
                onClick={() => onDismiss(iv.id)}
                disabled={processing === iv.id}
                style={{
                  padding: '10px 20px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: 'transparent',
                  color: cs.textDim,
                  border: `1px solid transparent`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = cs.danger; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = cs.textDim; }}
              >
                <X size={14} /> Dismiss
              </button>
            </div>
          ) : (
             <div style={{ fontSize: '12px', color: cs.textDim, fontWeight: 500 }}>
                Protocol resolution complete. Signals normalized.
             </div>
          )}
          
          <div style={{ fontSize: '11px', color: cs.textDim, fontWeight: 600, letterSpacing: '0.05em' }}>
            ID: {iv.id.split('-')[0].toUpperCase()}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
