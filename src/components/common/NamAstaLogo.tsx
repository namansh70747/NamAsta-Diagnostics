/**
 * NamAsta Diagnostics brand mark.
 *
 * Concept: a bold white MICROSCOPE on a deep maroon tile, with a RED BLOOD DROP as the
 * specimen on the stage — microscope (diagnostics) + blood (pathology). Reads instantly as a
 * lab, even for non-technical staff, and the heavy white silhouette stays sharp from a 16 px
 * taskbar icon up to full size. The "A" in the wordmark is gold so the name pops on the maroon.
 */
export function NamAstaMark({
  size = 44,
  className,
  animated = false,
}: {
  size?: number;
  className?: string;
  animated?: boolean;
}) {
  const u = "nm";
  return (
    <span
      className={(animated ? "logo-glow " : "") + (className ?? "")}
      style={{
        position: "relative",
        display: "inline-flex",
        width: size,
        height: size,
        borderRadius: size * 0.27,
        overflow: "hidden",
      }}
    >
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" role="img" aria-label="NamAsta Diagnostics">
        <defs>
          {/* Soft blue → teal tile */}
          <linearGradient id={`${u}-bg`} x1="4" y1="3" x2="44" y2="45" gradientUnits="userSpaceOnUse">
            <stop stopColor="#eaf4ff" />
            <stop offset="1" stopColor="#d6f3ee" />
          </linearGradient>
          <radialGradient id={`${u}-gloss`} cx="0.26" cy="0.08" r="0.95">
            <stop stopColor="#ffffff" stopOpacity="0.6" />
            <stop offset="0.6" stopColor="#ffffff" stopOpacity="0.05" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* ── Tile ── */}
        <rect x="2" y="2" width="44" height="44" rx="13" fill={`url(#${u}-bg)`} />
        <rect x="2" y="2" width="44" height="44" rx="13" fill={`url(#${u}-gloss)`} />
        <rect x="2.6" y="2.6" width="42.8" height="42.8" rx="12.5" stroke="#1f4eb6" strokeOpacity="0.12" strokeWidth="1" />

        {/* ── Microscope + atom orbitals + hexagon (same art as the app icon, mapped to tile) ── */}
        <g transform="translate(2.43,2.43) scale(0.3594)" strokeLinecap="round" strokeLinejoin="round">
          {/* atom orbitals */}
          <g fill="none" strokeWidth="2.4">
            <ellipse cx="60" cy="60" rx="50" ry="18.5" transform="rotate(22 60 60)" stroke="#29b6b0" />
            <ellipse cx="60" cy="60" rx="50" ry="18.5" transform="rotate(82 60 60)" stroke="#1f4eb6" />
            <ellipse cx="60" cy="60" rx="50" ry="18.5" transform="rotate(142 60 60)" stroke="#29b6b0" />
          </g>
          <circle cx="14" cy="48" r="2.8" fill="#1f4eb6" />
          <circle cx="104" cy="74" r="2.8" fill="#29b6b0" />
          <circle cx="44" cy="108" r="2.8" fill="#1f4eb6" />
          <circle cx="92" cy="20" r="2.4" fill="#29b6b0" />
          {/* hexagon frame */}
          <g fill="none" strokeWidth="5">
            <path d="M 60,4 L 108,32" stroke="#1f4eb6" />
            <path d="M 108,32 L 108,88" stroke="#29b6b0" />
            <path d="M 108,88 L 60,116" stroke="#1f4eb6" />
            <path d="M 60,116 L 12,88" stroke="#29b6b0" />
            <path d="M 12,88 L 12,32" stroke="#1f4eb6" />
            <path d="M 12,32 L 60,4" stroke="#29b6b0" />
          </g>
          {/* microscope */}
          <g transform="rotate(-22 60 60)">
            <path d="M 64,38 C 92,50 92,84 60,93 C 47,96 39,92 35,86" fill="none" stroke="#1f4eb6" strokeWidth="7" />
            <circle cx="86" cy="64" r="5.4" fill="#29b6b0" stroke="#1f4eb6" strokeWidth="3" />
            <rect x="45.5" y="32" width="19" height="44" rx="9.5" fill="#bfeee9" stroke="#1f4eb6" strokeWidth="4.4" />
            <rect x="43" y="21" width="18" height="14" rx="7" fill="#7fd8d2" stroke="#1f4eb6" strokeWidth="4.4" />
            <rect x="32" y="80" width="40" height="7" rx="3.5" fill="#1f4eb6" />
            <circle cx="52" cy="83.5" r="4.2" fill="#29b6b0" />
          </g>
        </g>
      </svg>

      {/* Sheen sweep (animated only) */}
      {animated && (
        <span
          aria-hidden
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            width: "55%",
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)",
            animation: "logo-sheen 4.5s ease-in-out infinite",
          }}
        />
      )}
    </span>
  );
}

/** Horizontal lockup: mark + "NamAsta / Diagnostics" wordmark. */
export function NamAstaWordmark({
  size = 40,
  light = false,
  className,
}: {
  size?: number;
  light?: boolean;
  className?: string;
}) {
  return (
    <span className={className} style={{ display: "inline-flex", alignItems: "center", gap: 11 }}>
      <NamAstaMark size={size} animated={light} />
      <span style={{ lineHeight: 1.05 }}>
        <span
          style={{
            display: "block",
            fontWeight: 800,
            letterSpacing: "-0.01em",
            fontSize: size * 0.46,
            color: light ? "#ffffff" : "#14151c",
          }}
        >
          Nam<span style={{ color: "#f59e0b" }}>A</span>sta
        </span>
        <span
          style={{
            display: "block",
            fontSize: size * 0.235,
            fontWeight: 600,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: light ? "rgba(255,255,255,0.5)" : "#8a8b97",
          }}
        >
          Diagnostics
        </span>
      </span>
    </span>
  );
}
