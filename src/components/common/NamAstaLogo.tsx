/**
 * NamAsta Diagnostics brand mark.
 *
 * Concept: The letter N whose diagonal IS a medical ECG heartbeat trace — the most
 * universally recognised diagnostic-lab symbol. Deep navy-blue tile (clinical, trustworthy),
 * clean white N strokes, teal pulse spike so the heartbeat reads immediately. The "A" in the
 * wordmark is gold so the brand name pops. Works at 28 px favicon scale up to full-size.
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
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        role="img"
        aria-label="NamAsta Diagnostics"
      >
        <defs>
          {/* Deep medical navy → teal gradient — clinical, not startup-purple */}
          <linearGradient id={`${u}-bg`} x1="2" y1="2" x2="46" y2="46" gradientUnits="userSpaceOnUse">
            <stop stopColor="#0c1a3e" />
            <stop offset="0.45" stopColor="#0f2d5c" />
            <stop offset="1" stopColor="#0a3d52" />
          </linearGradient>

          {/* ECG teal gradient for the heartbeat trace */}
          <linearGradient id={`${u}-ecg`} x1="13" y1="13" x2="35" y2="35" gradientUnits="userSpaceOnUse">
            <stop stopColor="#67e8f9" />
            <stop offset="0.5" stopColor="#22d3ee" />
            <stop offset="1" stopColor="#06b6d4" />
          </linearGradient>

          {/* Gloss highlight — top-left quarter */}
          <radialGradient id={`${u}-gloss`} cx="0.22" cy="0.1" r="0.8">
            <stop stopColor="#ffffff" stopOpacity="0.45" />
            <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.06" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>

          {/* Soft inner depth — bottom rim */}
          <linearGradient id={`${u}-depth`} x1="24" y1="4" x2="24" y2="46" gradientUnits="userSpaceOnUse">
            <stop stopColor="#38bdf8" stopOpacity="0" />
            <stop offset="1" stopColor="#0ea5e9" stopOpacity="0.22" />
          </linearGradient>

          {/* Glow filter for the ECG spike */}
          <filter id={`${u}-glow`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* ── Tile ── */}
        <rect x="2" y="2" width="44" height="44" rx="13" fill={`url(#${u}-bg)`} />
        <rect x="2" y="2" width="44" height="44" rx="13" fill={`url(#${u}-depth)`} />
        <rect x="2" y="2" width="44" height="44" rx="13" fill={`url(#${u}-gloss)`} />
        {/* subtle 1 px white rim */}
        <rect x="2.6" y="2.6" width="42.8" height="42.8" rx="12.5"
          stroke="#ffffff" strokeOpacity="0.14" strokeWidth="1" />

        {/* ── N monogram ──
            Two clean white verticals + a diagonal whose midpoint rises into a
            QRS complex (the canonical ECG spike) — pulse of life in a diagnostic lab.

            Path breakdown:
              • (13,34) → (13,13)          left vertical
              • (13,13) → (20,21.5)        normal diagonal start
              • (20,21.5) → (21.5,14)      QRS upstroke  (sharp rise)
              • (21.5,14) → (24.5,28)      QRS downstroke (sharp fall, below baseline)
              • (24.5,28) → (35,34)        recovery to end of diagonal
              The S-wave dip below the diagonal baseline is what makes this read
              unmistakably as an ECG trace rather than a mere kink.
        */}

        {/* Left vertical */}
        <path
          d="M 13,34 L 13,13"
          stroke="#ffffff"
          strokeWidth="4.6"
          strokeLinecap="round"
        />
        {/* Right vertical */}
        <path
          d="M 35,34 L 35,13"
          stroke="#ffffff"
          strokeWidth="4.6"
          strokeLinecap="round"
        />

        {/* ECG diagonal — shadow layer for depth */}
        <path
          d="M 13,13 L 20,21.5 L 21.5,14 L 24.5,28 L 35,34"
          stroke="#000000"
          strokeOpacity="0.3"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* ECG diagonal — teal glowing trace */}
        <path
          d="M 13,13 L 20,21.5 L 21.5,14 L 24.5,28 L 35,34"
          stroke={`url(#${u}-ecg)`}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          filter={`url(#${u}-glow)`}
        />

        {/* Bright white dot at the QRS peak — the "live signal" indicator */}
        <circle cx="21.5" cy="14" r="2.4" fill="#ffffff" />
        <circle cx="21.5" cy="14" r="1.3" fill="#a5f3fc" />
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
            background:
              "linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent)",
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
    <span
      className={className}
      style={{ display: "inline-flex", alignItems: "center", gap: 11 }}
    >
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
