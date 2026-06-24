import { useEffect, useRef, useState } from "react";
import { ChevronDown, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ComboOption<T extends string | number> {
  value: T;
  label: string;
  hint?: string;
}

/**
 * A searchable single-select dropdown. The `options` are shown in the order given
 * (callers pass them pre-ranked by frequency), and typing filters to matches — so the
 * thing you want is always near the top and one click/Enter away. Keyboard-first:
 * ArrowUp/Down to move, Enter to pick, Esc to close.
 */
export function Combobox<T extends string | number>({
  value, onChange, options, placeholder = "Select…", allowClear = true, className,
}: {
  value: T | null;
  onChange: (v: T | null) => void;
  options: ComboOption<T>[];
  placeholder?: string;
  allowClear?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hl, setHl] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selected = options.find(o => o.value === value) ?? null;

  // When closed, the input shows the selected label; when open, it shows what's typed.
  const q = query.trim().toLowerCase();
  const filtered = q
    ? options.filter(o => o.label.toLowerCase().includes(q))
    : options;

  useEffect(() => { setHl(0); }, [query, open, filtered.length]);

  // Keep the keyboard-highlighted row visible when arrowing through a long list
  // (e.g. the 40-doctor dropdown) — otherwise the highlight scrolls out of view.
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>(`[data-combo-idx="${hl}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [hl, open]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false); setQuery("");
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  function pick(v: T | null) {
    onChange(v);
    setOpen(false);
    setQuery("");
    inputRef.current?.blur();
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    // Stop these from bubbling to a parent form's Enter-advances-field handler.
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) { e.preventDefault(); e.stopPropagation(); setOpen(true); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); e.stopPropagation(); setHl(h => Math.min(h + 1, filtered.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); e.stopPropagation(); setHl(h => Math.max(h - 1, 0)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      const o = filtered[Math.min(hl, filtered.length - 1)];   // clamp in case the list shrank
      if (o) pick(o.value);
    } else if (e.key === "Escape") { e.stopPropagation(); setOpen(false); setQuery(""); }
  }

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <div className="relative">
        <input
          ref={inputRef}
          value={open ? query : (selected?.label ?? "")}
          placeholder={placeholder}
          onChange={e => { setQuery(e.target.value); if (!open) setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          className="field !pr-14 cursor-pointer"
          role="combobox"
          aria-expanded={open}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
          {allowClear && value != null && (
            <button type="button" tabIndex={-1} onMouseDown={e => { e.preventDefault(); pick(null); }}
              className="p-1 rounded text-[#5e6072] hover:text-[#3a3b45]" title="Clear">
              <X size={13} />
            </button>
          )}
          <ChevronDown size={15} className={cn("text-[#5e6072] transition-transform", open && "rotate-180")} />
        </div>
      </div>

      {open && (
        <div ref={listRef} className="card absolute z-20 top-full left-0 right-0 mt-1.5 max-h-60 overflow-y-auto shadow-[var(--shadow-pop)] animate-scale-in py-1">
          {filtered.length === 0 ? (
            <div className="px-4 py-2.5 text-[13px] text-[#5e6072]">No matches</div>
          ) : filtered.map((o, i) => (
            <button
              key={o.value}
              type="button"
              data-combo-idx={i}
              onMouseEnter={() => setHl(i)}
              onMouseDown={e => { e.preventDefault(); pick(o.value); }}
              className={cn(
                "w-full flex items-center justify-between gap-3 px-4 py-2 text-left text-[13.5px] transition-colors",
                i === hl ? "bg-[#eef0fe]" : "hover:bg-[#fafafe]"
              )}
            >
              <span className="min-w-0 truncate text-[#14151c]">{o.label}</span>
              <span className="flex items-center gap-2 shrink-0">
                {o.hint && <span className="text-[11.5px] text-[#5e6072]">{o.hint}</span>}
                {o.value === value && <Check size={14} className="text-[#4f46e5]" />}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
