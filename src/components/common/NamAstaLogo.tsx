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
          {/* Fresh cyan → blue → indigo tile */}
          <linearGradient id={`${u}-bg`} x1="3" y1="2" x2="45" y2="46" gradientUnits="userSpaceOnUse">
            <stop stopColor="#22d3ee" />
            <stop offset="0.5" stopColor="#3b82f6" />
            <stop offset="1" stopColor="#4f46e5" />
          </linearGradient>

          {/* Specimen drops on the stage */}
          <linearGradient id={`${u}-specimen`} x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#fde047" />
            <stop offset="1" stopColor="#fbbf24" />
          </linearGradient>

          {/* Top-left gloss */}
          <radialGradient id={`${u}-gloss`} cx="0.24" cy="0.08" r="0.9">
            <stop stopColor="#ffffff" stopOpacity="0.45" />
            <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.07" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* ── Tile ── */}
        <rect x="2" y="2" width="44" height="44" rx="13" fill={`url(#${u}-bg)`} />
        <rect x="2" y="2" width="44" height="44" rx="13" fill={`url(#${u}-gloss)`} />
        <rect x="2.6" y="2.6" width="42.8" height="42.8" rx="12.5" stroke="#ffffff" strokeOpacity="0.18" strokeWidth="1" />

        {/* ── Microscope + specimen (same art as the app icon, mapped into the tile) ── */}
        <g transform="translate(7.69,6.84) scale(0.683)" fill="#ffffff">
          {/* arm — the curved spine carrying the eyepiece */}
          <path d="M 23,7.5 C 32.5,7.5 35.5,15 33.5,23 L 28.7,23 C 30,17.5 28.5,12.6 23,12.6 Z" />
          {/* body tube + eyepiece cap */}
          <rect x="20.4" y="8.2" width="6.4" height="17.2" rx="3.2" />
          <rect x="19.2" y="6" width="8.8" height="4.6" rx="2.3" />
          {/* objective nub */}
          <rect x="21.4" y="24.2" width="4.4" height="3.4" rx="1.5" />
          {/* stage platform */}
          <rect x="11.5" y="27.4" width="17" height="3.8" rx="1.9" />
          {/* pillar */}
          <rect x="21.4" y="30" width="5" height="6.4" rx="1.8" />
          {/* base foot */}
          <path d="M 11,40.4 C 11,37 14.5,35 24,35 C 33.5,35 37,37 37,40.4 C 37,41.7 35.8,42.4 33.4,42.4 L 14.6,42.4 C 12.2,42.4 11,41.7 11,40.4 Z" />
          {/* specimen drops */}
          <circle cx="16" cy="25.2" r="2" fill={`url(#${u}-specimen)`} />
          <circle cx="20" cy="26" r="1.25" fill={`url(#${u}-specimen)`} />
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
