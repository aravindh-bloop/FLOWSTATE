'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useSession } from '../lib/session';
import { apiLogout } from '../lib/api';
import { cs, font } from '../lib/styles';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Home,
  BarChart2,
  Clock,
  BookOpen,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Zap,
  X,
} from 'lucide-react';

type SidebarProps = {
  collapsed: boolean;
  isMobile: boolean;
  onClose: () => void;
  onToggleCollapse: () => void;
};

export default function Sidebar({ collapsed, isMobile, onClose, onToggleCollapse }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useSession();
  const isClient = user?.role === 'client';

  const coachNav = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
    { icon: Users, label: 'Clients', href: '/clients' },
    { icon: CheckCircle2, label: 'Approvals', href: '/approvals' },
    { icon: AlertTriangle, label: 'Interventions', href: '/interventions' },
    { icon: FileText, label: 'Summaries', href: '/summaries' },
  ];

  const clientNav = [
    { icon: Home, label: 'Home', href: '/client' },
    { icon: BarChart2, label: 'Progress', href: '/client/progress' },
    { icon: Clock, label: 'Trackers', href: '/client/trackers' },
    { icon: BookOpen, label: 'Program', href: '/client/program' },
  ];

  const nav = isClient ? clientNav : coachNav;
  const goTo = (href: string) => { router.push(href); if (isMobile) onClose(); };
  const handleLogout = async () => { await apiLogout(); router.push('/login'); };

  const sidebarWidth = collapsed && !isMobile ? 80 : 280;
  const isCollapsedDesktop = collapsed && !isMobile;

  const initials = user?.name
    ? user.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
    : 'US';

  return (
    <>
      {/* Mobile backdrop */}
      <AnimatePresence>
        {isMobile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 180,
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }}
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={isMobile ? { x: -280 } : undefined}
        animate={isMobile ? { x: 0 } : { width: sidebarWidth }}
        exit={isMobile ? { x: -280 } : undefined}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        style={{
          height: '100%',
          flexShrink: 0,
          background: 'rgba(5, 5, 8, 0.95)',
          borderRight: `1px solid ${cs.border}`,
          display: 'flex',
          flexDirection: 'column',
          position: isMobile ? 'fixed' : 'relative',
          left: 0,
          top: 0,
          zIndex: 220,
          boxShadow: isMobile ? '20px 0 80px rgba(0,0,0,0.6)' : 'none',
          fontFamily: font,
          overflow: 'hidden',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        {/* Logo */}
        <div style={{
          padding: '24px',
          borderBottom: `1px solid ${cs.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: '80px',
        }}>
          <button
            onClick={() => goTo(isClient ? '/client' : '/')}
            style={{
              background: 'none', border: 'none', padding: 0, cursor: 'pointer',
              textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0,
            }}
          >
            <div style={{
              width: '32px', height: '32px', borderRadius: '10px',
              background: cs.primary,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              boxShadow: `0 0 24px ${cs.primaryGlow}`,
            }}>
              <Zap size={18} color="#000" strokeWidth={3} />
            </div>

            {!isCollapsedDesktop && (
              <div style={{ minWidth: 0 }}>
                <span style={{
                  fontSize: '20px', fontWeight: 800,
                  letterSpacing: '-0.04em', display: 'block',
                }}>
                  <span style={{
                    backgroundImage: cs.gradient,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}>Flow</span>
                  <span style={{ color: cs.textHeading }}>State</span>
                </span>
                <span style={{
                  fontSize: '10px', fontWeight: 700,
                  color: cs.primary,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  opacity: 0.7,
                }}>
                  {isClient ? 'Operator' : 'Architect'}
                </span>
              </div>
            )}
          </button>

          {isMobile && (
            <button onClick={onClose} style={{ color: cs.textHeading, background: 'none', border: 'none', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav style={{
          padding: '20px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          flex: 1,
          overflowY: 'auto',
          msOverflowStyle: 'none',
          scrollbarWidth: 'none',
        }}>
          {nav.map((item) => {
            const active = pathname === item.href || (item.href !== '/' && item.href !== '/client' && pathname.startsWith(item.href));
            return (
              <motion.button
                key={item.href}
                onClick={() => goTo(item.href)}
                whileHover={{ x: active ? 0 : 3 }}
                transition={{ duration: 0.15 }}
                style={{
                  width: '100%',
                  padding: isCollapsedDesktop ? '12px 0' : '12px 16px',
                  borderRadius: '12px',
                  border: active ? `1px solid rgba(223,255,0,0.08)` : '1px solid transparent',
                  background: active ? cs.primarySoft : 'transparent',
                  color: active ? cs.primary : cs.textDim,
                  fontSize: '14px',
                  fontWeight: active ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: isCollapsedDesktop ? 'center' : 'flex-start',
                  gap: '12px',
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.color = cs.textHeading;
                    e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.color = cs.textDim;
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                {active && (
                  <motion.div
                    layoutId="sidebar-active"
                    style={{
                      position: 'absolute',
                      left: 0,
                      width: '3px',
                      height: '20px',
                      background: cs.primary,
                      borderRadius: '0 4px 4px 0',
                      boxShadow: `0 0 8px ${cs.primaryGlow}`,
                    }}
                  />
                )}
                <item.icon size={20} strokeWidth={active ? 2.5 : 1.8} />
                {!isCollapsedDesktop && <span>{item.label}</span>}
              </motion.button>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding: '20px', borderTop: `1px solid ${cs.border}` }}>
          {!isCollapsedDesktop ? (
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: `1px solid ${cs.border}`,
              borderRadius: '16px',
              padding: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '12px',
            }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '12px',
                background: `linear-gradient(135deg, ${cs.primaryGlow}, rgba(0,255,163,0.1))`,
                color: cs.primary,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '14px', fontWeight: 800,
                border: `1px solid rgba(223,255,0,0.1)`,
              }}>
                {initials}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ color: cs.textHeading, fontWeight: 700, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.name || 'User'}
                </div>
                <div style={{ color: cs.textDim, fontSize: '11px', textTransform: 'capitalize' }}>
                  {user?.role || 'operator'}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '12px',
                background: cs.primaryGlow, color: cs.primary,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '14px', fontWeight: 800,
              }}>
                {initials}
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: isCollapsedDesktop ? 'center' : 'flex-start',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: '12px',
              border: `1px solid ${cs.dangerBorder}`,
              background: 'rgba(255, 69, 58, 0.04)',
              color: cs.danger,
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 69, 58, 0.1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 69, 58, 0.04)'; }}
          >
            <LogOut size={20} />
            {!isCollapsedDesktop && <span>Sign Out</span>}
          </button>

          {!isMobile && (
            <button
              onClick={onToggleCollapse}
              style={{
                marginTop: '16px',
                width: '100%',
                background: 'none',
                border: 'none',
                color: cs.textDim,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontSize: '12px',
                fontWeight: 600,
                opacity: 0.5,
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.5'; }}
            >
              {isCollapsedDesktop ? <ChevronRight size={16} /> : <><ChevronLeft size={16} /> Collapse</>}
            </button>
          )}
        </div>
      </motion.aside>
    </>
  );
}
