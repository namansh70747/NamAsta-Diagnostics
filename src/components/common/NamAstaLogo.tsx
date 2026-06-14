/**
 * NamAsta Diagnostics brand mark — a rich gem tile in deep indigo-violet with a bold "N"
 * whose diagonal is a glowing amber-gold strand carrying signal nodes. The "A" in the
 * wordmark is gold to make the brand name pop. Layered gloss + sheen sweep + breathing
 * glow make it feel alive and premium. (Customer lab report letterhead is separate.)
 */
export function NamAstaMark({ size = 44, className, animated = false }: { size?: number; className?: string; animated?: boolean }) {
  const u = "nm";
  return (
    <span
      className={(animated ? "logo-glow " : "") + (className ?? "")}
      style={{ position: "relative", display: "inline-flex", width: size, height: size, borderRadius: size * 0.27, overflow: "hidden" }}
    >
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" role="img" aria-label="NamAsta Diagnostics">
        <defs>
          {/* Rich deep indigo → violet → dark navy tile */}
          <linearGradient id={`${u}-bg`} x1="3" y1="2" x2="45" y2="46" gradientUnits="userSpaceOnUse">
            <stop stopColor="#4338ca" />
            <stop offset="0.4" stopColor="#6d28d9" />
            <stop offset="0.75" stopColor="#5b21b6" />
            <stop offset="1" stopColor="#1e1b4b" />
          </linearGradient>
          {/* Warm amber-gold strand — warm against the cool tile */}
          <linearGradient id={`${u}-strand`} x1="13" y1="13" x2="35" y2="36" gradientUnits="userSpaceOnUse">
            <stop stopColor="#fde68a" />
            <stop offset="0.5" stopColor="#f59e0b" />
            <stop offset="1" stopColor="#d97706" />
          </linearGradient>
          {/* Top-left gloss */}
          <radialGradient id={`${u}-gloss`} cx="0.25" cy="0.12" r="0.85">
            <stop stopColor="#ffffff" stopOpacity="0.55" />
            <stop offset="0.45" stopColor="#ffffff" stopOpacity="0.07" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
          {/* Soft inner rim light (bottom) */}
          <linearGradient id={`${u}-rim`} x1="24" y1="5" x2="24" y2="46" gradientUnits="userSpaceOnUse">
            <stop stopColor="#7c3aed" stopOpacity="0" />
            <stop offset="1" stopColor="#a78bfa" stopOpacity="0.35" />
          </linearGradient>
        </defs>

        {/* tile layers */}
        <rect x="2" y="2" width="44" height="44" rx="13" fill={`url(#${u}-bg)`} />
        <rect x="2" y="2" width="44" height="44" rx="13" fill={`url(#${u}-rim)`} />
        <rect x="2" y="2" width="44" height="44" rx="13" fill={`url(#${u}-gloss)`} />
        {/* border — subtle bright rim */}
        <rect x="2.5" y="2.5" width="43" height="43" rx="12.6" stroke="#ffffff" strokeOpacity="0.18" strokeWidth="1" />

        {/* monogram N — white uprights, amber-gold diagonal signal strand */}
        <g strokeLinecap="round" strokeLinejoin="round" fill="none">
          {/* shadow under strand for depth */}
          <path d="M15 14.5 L33 33.5" stroke="#000000" strokeOpacity="0.3" strokeWidth="6.8" />
          {/* uprights */}
          <path d="M15 33.5 V14.5" stroke="#ffffff" strokeWidth="4.6" />
          <path d="M33 33.5 V14.5" stroke="#ffffff" strokeWidth="4.6" />
          {/* amber strand */}
          <path d="M15 14.5 L33 33.5" stroke={`url(#${u}-strand)`} strokeWidth="4.2" />
        </g>

        {/* signal nodes — bright white with amber core */}
        <circle cx="19.8" cy="19.6" r="2.6" fill="#f59e0b" />
        <circle cx="19.8" cy="19.6" r="1.4" fill="#ffffff" />
        <circle cx="28.2" cy="28.4" r="2.6" fill="#f59e0b" />
        <circle cx="28.2" cy="28.4" r="1.4" fill="#ffffff" />
      </svg>

      {/* sheen sweep (animated only) */}
      {animated && (
        <span
          aria-hidden
          style={{
            position: "absolute", top: 0, bottom: 0, width: "55%",
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)",
            animation: "logo-sheen 4.5s ease-in-out infinite",
          }}
        />
      )}
    </span>
  );
}

/** Horizontal lockup: mark + "NamAsta Diagnostics" wordmark (login / onboarding headers). */
export function NamAstaWordmark({ size = 40, light = false, className }: { size?: number; light?: boolean; className?: string }) {
  return (
    <span className={className} style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
      <NamAstaMark size={size} animated={light} />
      <span style={{ lineHeight: 1.05 }}>
        <span style={{ display: "block", fontWeight: 800, letterSpacing: "-0.01em", fontSize: size * 0.46, color: light ? "#ffffff" : "#14151c" }}>
          Nam<span style={{ color: "#f59e0b" }}>A</span>sta
        </span>
        <span style={{ display: "block", fontSize: size * 0.235, fontWeight: 600, letterSpacing: "0.22em", textTransform: "uppercase", color: light ? "rgba(255,255,255,0.5)" : "#8a8b97" }}>
          Diagnostics
        </span>
      </span>
    </span>
  );
}
