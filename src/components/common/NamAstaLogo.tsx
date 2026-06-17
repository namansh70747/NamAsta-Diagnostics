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
          {/* Rich maroon tile — the brand's red tint */}
          <linearGradient id={`${u}-bg`} x1="2" y1="2" x2="46" y2="46" gradientUnits="userSpaceOnUse">
            <stop stopColor="#8e1530" />
            <stop offset="0.5" stopColor="#6a0f22" />
            <stop offset="1" stopColor="#3c0813" />
          </linearGradient>

          {/* Blood-drop gradient (the specimen on the stage) */}
          <linearGradient id={`${u}-drop`} x1="24" y1="19" x2="24" y2="29" gradientUnits="userSpaceOnUse">
            <stop stopColor="#ff6b70" />
            <stop offset="1" stopColor="#d61f2b" />
          </linearGradient>

          {/* Top-left gloss */}
          <radialGradient id={`${u}-gloss`} cx="0.22" cy="0.1" r="0.85">
            <stop stopColor="#ffffff" stopOpacity="0.4" />
            <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.05" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* ── Tile ── */}
        <rect x="2" y="2" width="44" height="44" rx="13" fill={`url(#${u}-bg)`} />
        <rect x="2" y="2" width="44" height="44" rx="13" fill={`url(#${u}-gloss)`} />
        <rect x="2.6" y="2.6" width="42.8" height="42.8" rx="12.5" stroke="#ffffff" strokeOpacity="0.16" strokeWidth="1" />

        {/* ── Microscope + blood specimen (same art as the app icon, mapped into the tile) ── */}
        <g transform="translate(6.84,6.27) scale(0.716)">
          <g stroke="#ffffff" strokeWidth="3.05" strokeLinecap="round" strokeLinejoin="round" fill="none">
            {/* eyepiece tube (angled, top) */}
            <line x1="30.2" y1="8.6" x2="24.6" y2="16.4" />
            {/* arm: sweeping curve from the head down to the base */}
            <path d="M 24.6,16.4 Q 34.4,20.5 31.2,31.5" />
            {/* objective barrel down toward the stage */}
            <line x1="24.6" y1="16.4" x2="21.6" y2="23.2" />
            {/* stage (specimen platform) */}
            <line x1="13.4" y1="28.2" x2="29.6" y2="28.2" />
            {/* pillar from the stage to the base */}
            <line x1="22.4" y1="28.2" x2="22.4" y2="33.4" />
            {/* curved foot / base */}
            <path d="M 13,38 Q 23,33.2 33,38" />
          </g>
          {/* eyepiece lens cap (solid) */}
          <circle cx="31.4" cy="7.4" r="3.05" fill="#ffffff" />
          {/* blood specimen drop sitting on the stage, just under the objective */}
          <path
            d="M 20.4,19.4 C 22.3,22.2 23.6,23.8 23.6,25.2 C 23.6,27 22.2,28.1 20.4,28.1 C 18.6,28.1 17.2,27 17.2,25.2 C 17.2,23.8 18.5,22.2 20.4,19.4 Z"
            fill={`url(#${u}-drop)`}
          />
          <ellipse cx="19.4" cy="24.8" rx="0.85" ry="1.3" fill="#ffffff" opacity="0.6" transform="rotate(-20 19.4 24.8)" />
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
