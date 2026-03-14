// ═══════════════════════════════════════════════════════════════════
// FLOWSTATE DESIGN SYSTEM — Premium Dark "Citrus" Theme
// ═══════════════════════════════════════════════════════════════════

import type { CSSProperties } from "react";

export const cs = {
  // Backgrounds — Deep organic darks
  bg: "#050505",
  bgAlt: "#0a0a0b",
  surface: "#0e0e11",
  surfaceRaised: "#18181b",
  surfaceHover: "#27272a",

  // Borders
  border: "rgba(255,255,255,0.06)",
  borderLight: "rgba(255,255,255,0.03)",
  borderFocus: "#DFFF00", // Citrus Green

  // Primary accent — Citrus Neon
  primary: "#DFFF00",
  primaryHover: "#ccff00",
  primaryGlow: "rgba(223,255,0,0.4)",
  primarySoft: "rgba(223,255,0,0.05)",

  // Gradient — Premium mesh gradients
  gradient: "linear-gradient(135deg, #DFFF00 0%, #00ffa3 100%)",
  gradientText: "linear-gradient(135deg, #DFFF00, #00ffa3)",
  gradientSubtle: "linear-gradient(180deg, rgba(223,255,0,0.05), transparent)",
  gradientGlass: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)",

  // Text — High contrast silver/white
  textHeading: "#ffffff",
  text: "#fafafa",
  textDim: "#a1a1aa",
  textMuted: "#71717a",

  // Status
  danger: "#ff453a", // Apple-style red
  dangerBg: "rgba(255,69,58,0.1)",
  dangerBorder: "rgba(255,69,58,0.2)",
  success: "#32d74b", // Apple-style green
  successBg: "rgba(50,215,75,0.1)",
  successBorder: "rgba(50,215,75,0.2)",
  warn: "#ffd60a", // Apple-style yellow
  warnBg: "rgba(255,214,10,0.1)",
  warnBorder: "rgba(255,214,10,0.2)",
  blue: "#0a84ff", // Apple-style blue
  blueBg: "rgba(10,132,255,0.1)",
  blueBorder: "rgba(10,132,255,0.2)",
  blueGlow: "rgba(10,132,255,0.4)",
  violet: "#bf5af2", // Apple-style purple
  violetBg: "rgba(191,90,242,0.1)",
  violetBorder: "rgba(191,90,242,0.2)",
} as const;

export const font = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

export const card = (extra: CSSProperties = {}): CSSProperties => ({
  background: cs.surface,
  border: `1px solid ${cs.border}`,
  borderRadius: "16px",
  padding: "24px",
  ...extra,
});

export const glassCard = (extra: CSSProperties = {}): CSSProperties => ({
  ...card(extra),
  background: "rgba(14,14,17,0.7)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  boxShadow: "0 8px 32px 0 rgba(0,0,0,0.37)",
});

export const lbl: CSSProperties = {
  fontSize: "11px",
  letterSpacing: "0.08em",
  color: cs.textDim,
  textTransform: "uppercase",
  display: "block",
  marginBottom: "8px",
  fontFamily: font,
  fontWeight: 600,
};

export const inp = (extra: CSSProperties = {}): CSSProperties => ({
  width: "100%",
  background: "rgba(255,255,255,0.03)",
  border: `1px solid ${cs.border}`,
  borderRadius: "10px",
  padding: "12px 16px",
  color: cs.textHeading,
  fontSize: "14px",
  outline: "none",
  boxSizing: "border-box" as const,
  fontFamily: font,
  caretColor: cs.primary,
  transition: "all 0.2s ease",
  ...extra,
});

export const btn = (
  v: "primary" | "secondary" | "danger" | "ghost" = "primary",
  extra: CSSProperties = {}
): CSSProperties => {
  const base: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    borderRadius: "10px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: font,
    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
    lineHeight: "1",
    border: "none",
  };
  switch (v) {
    case "primary":
      return { 
        ...base, 
        padding: "12px 24px", 
        background: cs.primary, 
        color: "#000", 
        boxShadow: `0 4px 14px 0 ${cs.primaryGlow}`,
        ...extra 
      };
    case "secondary":
      return { 
        ...base, 
        padding: "12px 24px", 
        background: "rgba(255,255,255,0.05)", 
        border: `1px solid ${cs.border}`, 
        color: cs.textHeading, 
        ...extra 
      };
    case "danger":
      return { 
        ...base, 
        padding: "12px 24px", 
        background: cs.dangerBg, 
        border: `1px solid ${cs.dangerBorder}`, 
        color: cs.danger, 
        ...extra 
      };
    case "ghost":
      return { 
        ...base, 
        padding: "10px 16px", 
        background: "transparent", 
        color: cs.textDim, 
        ...extra 
      };
    default:
      return { ...base, ...extra };
  }
};

export function adherenceColor(v: number): string {
  if (v < 50) return cs.danger;
  if (v < 70) return cs.warn;
  return cs.primary;
}

export function statusStyle(status: string): { fg: string; bg: string; border: string } {
  const s = status.toLowerCase();
  switch (s) {
    case "active":
      return { fg: cs.success, bg: cs.successBg, border: cs.successBorder };
    case "paused":
      return { fg: cs.warn, bg: cs.warnBg, border: cs.warnBorder };
    case "pending":
      return { fg: cs.violet, bg: cs.violetBg, border: cs.violetBorder };
    case "completed":
    case "approved":
      return { fg: cs.success, bg: cs.successBg, border: cs.successBorder };
    case "rejected":
    case "dismissed":
      return { fg: cs.danger, bg: cs.dangerBg, border: cs.dangerBorder };
    case "sent":
      return { fg: cs.blue, bg: cs.blueBg, border: cs.blueBorder };
    default:
      return { fg: cs.textDim, bg: cs.surfaceRaised, border: cs.border };
  }
}

