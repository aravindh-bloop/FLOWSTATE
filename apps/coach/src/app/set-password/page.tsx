'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../../lib/session';
import { cs, inp, btn } from '../../lib/styles';
import { AuroraBackground } from '../../components/aurora-background';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Eye, EyeOff, Lock, ArrowRight } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

export default function SetPasswordPage() {
  const [current, setCurrent] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { user } = useSession();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPw !== confirm) { setError('Passwords do not match'); return; }
    if (newPw.length < 8) { setError('Minimum 8 characters required'); return; }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentPassword: current, newPassword: newPw }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as any).message ?? 'Credential update failed');
      }
      router.push(user?.role === 'client' ? '/client' : '/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuroraBackground>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ width: '100%', maxWidth: '440px', zIndex: 10 }}
      >
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ 
            width: '64px', height: '64px', borderRadius: '20px', 
            background: 'rgba(223, 255, 0, 0.1)', border: `1.5px solid ${cs.primary}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px',
            color: cs.primary, boxShadow: `0 10px 30px ${cs.primaryGlow}`
          }}>
            <ShieldCheck size={32} strokeWidth={2.5} />
          </div>
          <h1 style={{ 
            fontSize: '32px', fontWeight: 800, color: '#fff', margin: '0 0 10px', 
            letterSpacing: '-0.04em', lineHeight: 1.1 
          }}>
             Secure <span style={{ color: cs.primary }}>Access</span>.
          </h1>
          <p style={{ fontSize: '15px', color: cs.textDim, fontWeight: 500 }}>
            Update your authentication credentials
          </p>
        </div>

        <div className="ray-card-outer">
          <div className="ray-card-dot" />
          <div className="ray-card-inner" style={{ padding: '40px' }}>
            <div className="ray-card-ray" />
            
            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  style={{ 
                    background: 'rgba(255, 69, 58, 0.1)', 
                    border: `1.5px solid rgba(255, 69, 58, 0.2)`, 
                    borderRadius: '12px', padding: '12px 16px', marginBottom: '24px', 
                    fontSize: '13px', color: '#ff9b9b', fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: '10px'
                  }}
                >
                  <Lock size={14} /> {error}
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ position: 'relative' }}>
                <span className="float-label">Current Key</span>
                <input 
                  type={showCurrent ? "text" : "password"} 
                  value={current} 
                  onChange={(e) => setCurrent(e.target.value)} 
                  required 
                  style={inp({ background: 'rgba(255,255,255,0.02)', paddingRight: '50px' })} 
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  style={{ position: 'absolute', right: '16px', bottom: '16px', background: 'none', border: 'none', color: cs.textDim, cursor: 'pointer' }}
                >
                  {showCurrent ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              <div style={{ position: 'relative' }}>
                <span className="float-label">New Secure Key</span>
                <input 
                  type={showNew ? "text" : "password"} 
                  value={newPw} 
                  onChange={(e) => setNewPw(e.target.value)} 
                  required 
                  style={inp({ background: 'rgba(255,255,255,0.02)', paddingRight: '50px' })} 
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  style={{ position: 'absolute', right: '16px', bottom: '16px', background: 'none', border: 'none', color: cs.textDim, cursor: 'pointer' }}
                >
                  {showNew ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              <div>
                <span className="float-label">Verify New Key</span>
                <input 
                  type="password" 
                  value={confirm} 
                  onChange={(e) => setConfirm(e.target.value)} 
                  required 
                  style={inp({ background: 'rgba(255,255,255,0.02)' })} 
                />
              </div>

              <button 
                type="submit" 
                disabled={loading} 
                className="glow-border"
                style={{ 
                  ...btn('primary', { width: '100%', padding: '16px 0', marginTop: '8px', fontSize: '15px', fontWeight: 800 }),
                  boxShadow: `0 10px 25px ${cs.primaryGlow}`,
                  opacity: loading ? 0.7 : 1 
                }}
              >
                {loading ? (
                   <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                      <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                      UPDATING...
                   </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                    COMMIT CHANGES <ArrowRight size={18} strokeWidth={3} />
                  </div>
                )}
              </button>
            </form>
          </div>
        </div>
      </motion.div>
    </AuroraBackground>
  );
}
