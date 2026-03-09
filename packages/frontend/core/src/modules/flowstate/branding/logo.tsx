/**
 * FlowState — Logo components.
 *
 * SVG wordmark and icon for use in the sidebar header,
 * login page, and any other branded surfaces.
 *
 * Usage:
 *   <FlowStateLogo />        — full wordmark (default width 120px)
 *   <FlowStateIcon size={24} /> — icon only (square)
 */

interface LogoProps {
  width?: number;
  className?: string;
}

interface IconProps {
  size?: number;
  className?: string;
}

/**
 * Full FlowState wordmark — "Flow" bold + "State" regular in brand teal.
 */
export function FlowStateLogo({ width = 120, className }: LogoProps) {
  return (
    <svg
      width={width}
      viewBox="0 0 120 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="FlowState"
      role="img"
    >
      <text
        x="0"
        y="21"
        fontFamily="Inter, SF Pro Display, system-ui, sans-serif"
        fontWeight="700"
        fontSize="18"
        fill="var(--affine-primary-color)"
        letterSpacing="-0.4"
      >
        Flow
      </text>
      <text
        x="45"
        y="21"
        fontFamily="Inter, SF Pro Display, system-ui, sans-serif"
        fontWeight="400"
        fontSize="18"
        fill="var(--affine-text-primary-color)"
        letterSpacing="-0.2"
      >
        State
      </text>
    </svg>
  );
}

/**
 * FlowState icon — a stylised "F" in a rounded square, brand teal.
 * Used in compact contexts (favicon, sidebar collapsed state).
 */
export function FlowStateIcon({ size = 24, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="FlowState icon"
      role="img"
    >
      <rect
        width="24"
        height="24"
        rx="6"
        fill="var(--affine-primary-color)"
      />
      <path
        d="M7 7h10v2.5H9.5v2h6.5v2.5H9.5V17H7V7Z"
        fill="white"
      />
    </svg>
  );
}
