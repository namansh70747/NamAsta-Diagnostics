import { useEffect, useLayoutEffect, useRef, useState, type ComponentType } from "react";
import { X, ArrowLeft, ArrowRight, Check } from "lucide-react";

/**
 * Game-style guided tutorial. A dimmed screen puts a bright "spotlight" on one
 * element at a time and shows a simple card (big icon, short words, Back/Next/Skip).
 *
 * Use imperatively from anywhere:  `startTutorial(steps)`  — mount <TutorialHost/> once at root.
 * Steps with no `target` are shown centered (good for a welcome/finish card).
 *
 * Language is deliberately plain English + a large icon per step, because many lab
 * staff don't read English well — keep every `body` to one short, simple sentence.
 */
export type TutorialStep = {
  /** CSS selector of the element to spotlight (e.g. `[data-tour="add-test"]`). Omit for a centered card. */
  target?: string;
  /** Big icon shown in the card (lucide component). */
  icon?: ComponentType<{ size?: number | string; strokeWidth?: number; className?: string }>;
  title: string;
  /** ONE short, simple sentence. */
  body: string;
};

let emit: ((steps: TutorialStep[]) => void) | null = null;

/** Start a tutorial from anywhere. No-op (logs) before <TutorialHost/> mounts. */
export function startTutorial(steps: TutorialStep[]) {
  if (emit) emit(steps);
}

/** True if the user has already finished/skipped this tour id. */
export function tourSeen(id: string): boolean {
  return localStorage.getItem(`scl_tour_seen_${id}`) === "1";
}
export function markTourSeen(id: string) {
  localStorage.setItem(`scl_tour_seen_${id}`, "1");
}
/** Forget a tour so it auto-plays again (used by the "replay" list in Settings). */
export function resetTourSeen(id: string) {
  localStorage.removeItem(`scl_tour_seen_${id}`);
}

const PAD = 8; // spotlight breathing room around the target

export function TutorialHost() {
  const [steps, setSteps] = useState<TutorialStep[] | null>(null);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardPos, setCardPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  useEffect(() => {
    emit = (s) => { if (s.length) { setSteps(s); setI(0); } };
    return () => { emit = null; };
  }, []);

  const close = () => { setSteps(null); setRect(null); };
  const step = steps?.[i];
  const total = steps?.length ?? 0;

  // Locate + scroll to the target, then measure its box. Re-measure on resize.
  useEffect(() => {
    if (!step) return;
    let cancelled = false;
    const measure = () => {
      if (cancelled) return;
      const el = step.target ? document.querySelector(step.target) : null;
      if (el) {
        el.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
        // measure after the smooth scroll settles
        setTimeout(() => { if (!cancelled) setRect(el.getBoundingClientRect()); }, 280);
      } else {
        setRect(null); // missing anchor or intentional centered card → degrade to centered
      }
    };
    measure();
    const onResize = () => {
      const el = step.target ? document.querySelector(step.target) : null;
      setRect(el ? el.getBoundingClientRect() : null);
    };
    window.addEventListener("resize", onResize);
    return () => { cancelled = true; window.removeEventListener("resize", onResize); };
  }, [step, i]);

  // Keyboard: Esc skips, arrows / Enter navigate.
  useEffect(() => {
    if (!steps) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); skip(); }
      else if (e.key === "ArrowRight" || e.key === "Enter") { e.preventDefault(); next(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); setI(v => Math.max(0, v - 1)); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps, i]);

  // Position the card relative to the spotlight (below, else above, else centered).
  useLayoutEffect(() => {
    if (!steps) return;
    const card = cardRef.current;
    const cw = card?.offsetWidth ?? 340;
    const ch = card?.offsetHeight ?? 200;
    const vw = window.innerWidth, vh = window.innerHeight;
    if (!rect) {
      setCardPos({ top: Math.max(16, vh / 2 - ch / 2), left: Math.max(16, vw / 2 - cw / 2) });
      return;
    }
    const gap = 16;
    let top = rect.bottom + gap;
    if (top + ch > vh - 12) {
      const above = rect.top - gap - ch;
      top = above >= 12 ? above : Math.max(12, vh - ch - 12);
    }
    let left = rect.left + rect.width / 2 - cw / 2;
    left = Math.min(Math.max(12, left), vw - cw - 12);
    setCardPos({ top, left });
  }, [rect, steps, i]);

  if (!steps || !step) return null;

  const isLast = i === total - 1;
  const Icon = step.icon;

  function next() { if (isLast) finish(); else setI(v => Math.min(total - 1, v + 1)); }
  function skip() { finish(); }
  function finish() { close(); }

  return (
    <div className="fixed inset-0 z-[90] animate-fade-in" aria-modal="true" role="dialog">
      {/* Spotlight: a transparent hole over the target with a huge shadow dimming everything else. */}
      {rect ? (
        <div
          className="pointer-events-none fixed rounded-xl transition-all duration-200"
          style={{
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            boxShadow: "0 0 0 9999px rgba(14,15,22,0.62)",
            outline: "3px solid rgba(99,102,241,0.95)",
            outlineOffset: "2px",
          }}
        />
      ) : (
        // No target → plain dim backdrop (centered card).
        <div className="fixed inset-0 bg-[#0e0f16]/62" />
      )}

      {/* Click-blocker so the app can't be touched mid-tour (transparent, behind the card). */}
      <div className="fixed inset-0" onMouseDown={(e) => e.preventDefault()} />

      {/* Tutorial card */}
      <div
        ref={cardRef}
        className="fixed w-[340px] max-w-[calc(100vw-24px)] rounded-2xl bg-white shadow-[var(--shadow-pop)] animate-pop-in"
        style={{ top: cardPos.top, left: cardPos.left }}
      >
        <div className="p-5">
          <div className="flex items-start gap-3.5">
            {Icon && (
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white"
                style={{ background: "linear-gradient(135deg, #6d74f5 0%, #6366f1 55%, #4f46e5 100%)" }}
              >
                <Icon size={24} strokeWidth={2} />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[16px] font-bold text-[#14151c] leading-snug">{step.title}</p>
              <p className="mt-1 text-[14px] text-[#3a3b45] leading-relaxed">{step.body}</p>
            </div>
            <button
              onClick={skip}
              title="Close"
              className="shrink-0 -mr-1 -mt-1 p-1.5 rounded-lg text-[#5e6072] hover:bg-[#eef0f4] hover:text-[#14151c] transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            {/* progress dots */}
            <div className="flex items-center gap-1.5">
              {steps.map((_, n) => (
                <span
                  key={n}
                  className={n === i ? "h-2 w-5 rounded-full bg-[#6366f1] transition-all" : "h-2 w-2 rounded-full bg-[#d3d4df] transition-all"}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              {i > 0 && (
                <button onClick={() => setI(v => Math.max(0, v - 1))} className="btn btn-secondary !px-3 !py-1.5 text-[13px]">
                  <ArrowLeft size={15} /> Back
                </button>
              )}
              <button onClick={next} className="btn btn-primary !px-3.5 !py-1.5 text-[13px]">
                {isLast ? <><Check size={15} /> Done</> : <>Next <ArrowRight size={15} /></>}
              </button>
            </div>
          </div>

          {!isLast && (
            <button onClick={skip} className="mt-3 w-full text-center text-[12.5px] text-[#5e6072] hover:text-[#14151c] transition-colors">
              Skip tutorial
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
