'use client';

import { useSession } from '../lib/session';
import Sidebar from './sidebar';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, ReactNode } from 'react';
import { cs, font } from '../lib/styles';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu } from 'lucide-react';

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/clients': 'Clients',
  '/approvals': 'Approvals',
  '/interventions': 'Interventions',
  '/summaries': 'Summaries',
  '/client': 'Home',
  '/client/progress': 'Progress',
  '/client/trackers': 'Check-in History',
  '/client/program': 'Your Program',
};

export function AuthLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [pathname, isMobile]);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: cs.bg,
        fontFamily: font,
      }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!user) return null;

  const pageTitle = pageTitles[pathname] ?? (pathname.startsWith('/clients/') ? 'Client Detail' : '');

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
      background: cs.bg,
      fontFamily: font,
      color: cs.text,
    }}>
      {/* Background layers */}
      <div className="mesh-gradient" style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }} />
      <div className="noise-overlay" />

      {/* Aurora subtle overlay (low opacity for inside pages) */}
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.15,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: '-10px',
            backgroundImage:
              'repeating-linear-gradient(100deg,#000 0%,#000 7%,transparent 10%,transparent 12%,#000 16%), repeating-linear-gradient(100deg,#3b82f6 10%,#a5b4fc 15%,#93c5fd 20%,#ddd6fe 25%,#60a5fa 30%)',
            backgroundSize: '300%, 200%',
            animation: 'aurora 60s linear infinite',
            filter: 'blur(10px)',
            opacity: 0.35,
          }}
        />
      </div>

      {/* Sidebar */}
      <AnimatePresence>
        {(!isMobile || sidebarOpen) && (
          <Sidebar
            collapsed={collapsed}
            isMobile={isMobile}
            onClose={() => setSidebarOpen(false)}
            onToggleCollapse={() => setCollapsed((p) => !p)}
          />
        )}
      </AnimatePresence>

      {/* Main content */}
      <main style={{
        flex: 1,
        overflowX: 'hidden',
        overflowY: 'auto',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        zIndex: 1,
      }}>
        {/* Header */}
        <header style={{
          height: '64px',
          minHeight: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: isMobile ? '0 20px' : '0 40px',
          borderBottom: `1px solid ${cs.border}`,
          position: 'sticky',
          top: 0,
          zIndex: 30,
          background: 'rgba(5, 5, 8, 0.6)',
          backdropFilter: 'blur(20px) saturate(1.2)',
          WebkitBackdropFilter: 'blur(20px) saturate(1.2)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {isMobile && (
              <button
                onClick={() => setSidebarOpen(true)}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: `1px solid ${cs.border}`,
                  color: cs.textHeading,
                  cursor: 'pointer',
                  borderRadius: '10px',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                }}
              >
                <Menu size={18} />
              </button>
            )}

            {isMobile && (
              <span style={{
                fontFamily: font,
                fontSize: '18px',
                fontWeight: 800,
                letterSpacing: '-0.03em',
              }}>
                <span style={{
                  backgroundImage: cs.gradient,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>Flow</span>
                <span style={{ color: cs.textHeading }}>State</span>
              </span>
            )}

            {!isMobile && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: cs.success,
                  boxShadow: `0 0 8px ${cs.success}`,
                }} />
                <h1 style={{
                  color: cs.textHeading,
                  fontFamily: font,
                  fontSize: '13px',
                  fontWeight: 700,
                  margin: 0,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}>
                  {pageTitle}
                </h1>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Optional header actions */}
          </div>
        </header>

        {/* Content */}
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
          style={{
            padding: isMobile ? '20px' : '40px',
            flex: 1,
            minHeight: 0,
          }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
