/**
 * NamAsta Diagnostics brand mark — a confident geometric monogram "N" whose diagonal is a
 * cyan "signal" stroke (the diagnostic line), on a deep indigo tile. Deliberately simple and
 * brand-like. Used across the app chrome (login, sidebar, onboarding) and the window icon.
 * (Each customer lab brands its own printed REPORT separately.)
 */
export function NamAstaMark({ size = 44, className, glow = false }: { size?: number; className?: string; glow?: boolean }) {
  const id = "namasta";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      role="img"
      aria-label="NamAsta Diagnostics"
      style={glow ? { filter: "drop-shadow(0 8px 18px rgba(79,70,229,0.45))" } : undefined}
    >
      <defs>
        <linearGradient id={`${id}-bg`} x1="4" y1="2" x2="44" y2="46" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6d74f5" />
          <stop offset="1" stopColor="#4338ca" />
        </linearGradient>
      </defs>
      {/* tile */}
      <rect x="2" y="2" width="44" height="44" rx="12.5" fill={`url(#${id}-bg)`} />
      <rect x="2" y="2" width="44" height="22" rx="12.5" fill="#ffffff" fillOpacity="0.06" />
      {/* monogram N — white uprights, cyan "signal" diagonal */}
      <g strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M16 33 V 16" stroke="#ffffff" />
        <path d="M32 33 V 16" stroke="#ffffff" />
        <path d="M16 16 L 32 33" stroke="#22d3ee" />
      </g>
    </svg>
  );
}

/** Horizontal lockup: mark + "NamAsta Diagnostics" wordmark (login / onboarding headers). */
export function NamAstaWordmark({ size = 40, light = false, className }: { size?: number; light?: boolean; className?: string }) {
  return (
    <span className={className} style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
      <NamAstaMark size={size} glow={light} />
      <span style={{ lineHeight: 1.05 }}>
        <span style={{ display: "block", fontWeight: 800, letterSpacing: "-0.01em", fontSize: size * 0.46, color: light ? "#ffffff" : "#14151c" }}>
          Nam<span style={{ color: light ? "#67e8f9" : "#0891b2" }}>A</span>sta
        </span>
        <span style={{ display: "block", fontSize: size * 0.235, fontWeight: 600, letterSpacing: "0.22em", textTransform: "uppercase", color: light ? "rgba(255,255,255,0.55)" : "#8a8b97" }}>
          Diagnostics
        </span>
      </span>
    </span>
  );
}
