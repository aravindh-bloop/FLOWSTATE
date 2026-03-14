'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiRegisterCoach } from '../../lib/api';
import { useSession } from '../../lib/session';
import { cs, font, inp, lbl, btn } from '../../lib/styles';
import { AuroraBackground } from '../../components/aurora-background';
import { motion } from 'framer-motion';
import { Zap, ArrowRight, Eye, EyeOff } from 'lucide-react';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const router = useRouter();
  const { refresh } = useSession();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await apiRegisterCoach(name, email, password);
      await refresh();
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuroraBackground>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '48px 24px',
      }}>
        <motion.div
          initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          style={{ width: '100%', maxWidth: '460px' }}
        >
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.6 }}
              style={{
                width: 56, height: 56,
                borderRadius: 16,
                background: cs.primary,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px',
                boxShadow: `0 0 40px ${cs.primaryGlow}, 0 0 80px rgba(223,255,0,0.08)`,
              }}
            >
              <Zap size={28} color="#000" strokeWidth={3} />
            </motion.div>
            <h1 style={{
              fontSize: 'clamp(36px, 6vw, 48px)',
              fontWeight: 300,
              color: cs.textHeading,
              margin: '0 0 8px',
              lineHeight: 1.1,
              letterSpacing: '-0.03em',
              fontFamily: font,
            }}>
              <span style={{
                fontWeight: 600,
                backgroundImage: cs.gradient,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>Flow</span>State
            </h1>
            <p style={{
              fontSize: '13px',
              color: cs.textDim,
              margin: 0,
              fontFamily: font,
              fontWeight: 400,
            }}>
              Register a new coach account.
            </p>
          </div>

          {/* Ray Card */}
          <div className="ray-card-outer">
            <div className="ray-card-dot" />
            <div className="ray-card-inner" style={{ padding: '40px 36px', alignItems: 'stretch' }}>
              <div className="ray-card-ray" />
              <div className="ray-card-line topl" />
              <div className="ray-card-line leftl" />
              <div className="ray-card-line bottoml" />
              <div className="ray-card-line rightl" />

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    background: cs.dangerBg,
                    border: `1px solid ${cs.dangerBorder}`,
                    borderRadius: '12px',
                    padding: '12px 16px',
                    marginBottom: '24px',
                    fontSize: '13px',
                    color: cs.danger,
                    fontFamily: font,
                    fontWeight: 500,
                  }}
                >
                  {error}
                </motion.div>
              )}

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '22px', position: 'relative', zIndex: 1 }}>
                <div>
                  <span style={lbl}>Name</span>
                  <input
                    type="text"
                    required
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={inp({ borderRadius: '12px' })}
                    autoFocus
                  />
                </div>
                <div>
                  <span style={lbl}>Email</span>
                  <input
                    type="email"
                    required
                    placeholder="you@flowstate.app"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={inp({ borderRadius: '12px' })}
                  />
                </div>
                <div>
                  <span style={lbl}>Password</span>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPw ? 'text' : 'password'}
                      required
                      placeholder="Choose a secure password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      style={inp({ borderRadius: '12px', paddingRight: '44px' })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      style={{
                        position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer', color: cs.textDim,
                        padding: 4, display: 'flex',
                      }}
                    >
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    ...btn('primary', { width: '100%', padding: '15px 0', marginTop: '8px', borderRadius: '12px', fontSize: '15px', fontWeight: 700 }),
                    opacity: loading ? 0.5 : 1,
                  }}
                >
                  {loading ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                      <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                      Creating account...
                    </span>
                  ) : (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                      Create Account <ArrowRight size={16} />
                    </span>
                  )}
                </button>
              </form>

              <div style={{
                marginTop: '28px',
                textAlign: 'center',
                fontSize: '13px',
                color: cs.textDim,
                fontFamily: font,
                position: 'relative',
                zIndex: 1,
              }}>
                Already have an account?{' '}
                <Link href="/login" style={{
                  color: cs.primary,
                  textDecoration: 'none',
                  fontWeight: 600,
                }}>
                  Sign in
                </Link>
              </div>
            </div>
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            style={{
              textAlign: 'center', marginTop: '32px',
              fontSize: '11px', color: 'rgba(255,255,255,0.2)',
              fontFamily: font, fontWeight: 500,
            }}
          >
            © 2025 FlowState Biological Performance Systems
          </motion.p>
        </motion.div>
      </div>
    </AuroraBackground>
  );
}
