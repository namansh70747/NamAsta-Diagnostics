import { useRef, useState, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { listTests } from "@/lib/queries/tests";
import { Combobox } from "@/components/common/Combobox";
import { BUILTIN_CALC_CODES, extractCodes, validateFormula, previewFormula } from "@/lib/calc";
import { Test } from "@/types";
import { cn } from "@/lib/utils";

function renderReadsAs(formula: string, codeMap: Map<string, Test>): ReactNode[] {
  const parts: ReactNode[] = [];
  let last = 0;
  const re = /[A-Za-z][A-Za-z0-9_]*/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(formula)) !== null) {
    const before = formula.slice(last, m.index).replace(/\*/g, "×").replace(/\//g, "÷");
    if (before) parts.push(before);
    const code = m[0];
    const test = codeMap.get(code);
    if (test) {
      parts.push(
        <span key={`c${m.index}`} className="font-semibold text-[#14151c]">
          {test.name}
        </span>
      );
    } else {
      parts.push(
        <span key={`u${m.index}`} className="font-semibold text-[#b91c1c]">
          {code}?
        </span>
      );
    }
    last = m.index + code.length;
  }
  const after = formula.slice(last).replace(/\*/g, "×").replace(/\//g, "÷");
  if (after) parts.push(after);
  return parts;
}

const OPERATORS = [
  { label: "+", value: "+" },
  { label: "−", value: "-" },
  { label: "×", value: "*" },
  { label: "÷", value: "/" },
  { label: "(", value: "(" },
  { label: ")", value: ")" },
] as const;

export function FormulaBuilder({
  value,
  onChange,
  currentCode,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  currentCode: string;
  disabled: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const savedCursorRef = useRef<number>(0);
  const [trialValues, setTrialValues] = useState<Record<string, string>>({});

  const { data: allTests = [] } = useQuery({
    queryKey: ["tests", "all"],
    queryFn: () => listTests(undefined, false),
  });

  const codeMap = new Map(allTests.map(t => [t.code, t]));
  const knownCodes = new Set(allTests.map(t => t.code));
  const isBuiltin = BUILTIN_CALC_CODES.has(currentCode);

  const validation = validateFormula(value, knownCodes);
  const referencedCodes = [...new Set(extractCodes(value))].filter(c => knownCodes.has(c));

  function saveCursor() {
    savedCursorRef.current = inputRef.current?.selectionStart ?? value.length;
  }

  function insertAtCursor(text: string) {
    const pos = savedCursorRef.current;
    const before = value.slice(0, pos);
    const after = value.slice(pos);
    const needSpaceBefore = before.length > 0 && !/[\s(]$/.test(before);
    const needSpaceAfter = after.length > 0 && !/^[\s)]/.test(after);
    const inserted = (needSpaceBefore ? " " : "") + text + (needSpaceAfter ? " " : "");
    const next = before + inserted + after;
    onChange(next);
    const newPos = pos + inserted.length;
    savedCursorRef.current = newPos;
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(newPos, newPos);
      }
    }, 0);
  }

  function handleBackspace() {
    if (disabled) return;
    const pos = savedCursorRef.current;
    const before = value.slice(0, pos);
    if (!before) return;
    // Delete last token (word, number, or single char) before cursor
    const tokenMatch = before.match(/^(.*?)(\s*[A-Za-z][A-Za-z0-9_]*\s*|\s*[\d.]+\s*|\s*.\s*)$/s);
    const newBefore = tokenMatch ? tokenMatch[1] : before.slice(0, -1);
    savedCursorRef.current = newBefore.length;
    onChange(newBefore + value.slice(pos));
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(newBefore.length, newBefore.length);
      }
    }, 0);
  }

  function handleClear() {
    if (disabled) return;
    onChange("");
    setTrialValues({});
    savedCursorRef.current = 0;
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  // Try it calculator
  const trialSample: Record<string, number> = {};
  for (const code of referencedCodes) {
    const v = parseFloat(trialValues[code] ?? "");
    if (!isNaN(v)) trialSample[code] = v;
  }
  const allFilled = referencedCodes.length > 0
    && referencedCodes.every(c => !isNaN(parseFloat(trialValues[c] ?? "")));
  const trialResult = allFilled && validation.ok
    ? previewFormula(value, trialSample, 2)
    : "—";

  const insertOptions = allTests
    .filter(t => t.code !== currentCode && !t.is_panel)
    .map(t => ({ value: t.code, label: t.name, hint: t.code }));

  return (
    <div className="space-y-2.5">
      {isBuiltin && (
        <div className="px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
          <span className="text-[11.5px] text-amber-700 leading-snug">
            This is a built-in calculation — editing the formula here won't change how it computes.
          </span>
        </div>
      )}

      {/* Formula input */}
      <input
        ref={inputRef}
        type="text"
        value={value}
        disabled={disabled}
        onChange={e => { onChange(e.target.value); saveCursor(); }}
        onKeyUp={saveCursor}
        onMouseUp={saveCursor}
        onClick={saveCursor}
        onBlur={saveCursor}
        placeholder="e.g. CHOL - BHDL - TG / 5"
        className={cn("field font-mono", disabled && "opacity-60")}
      />

      {/* Reads-as / validation feedback */}
      {value.trim() !== "" && (
        <div className={cn(
          "rounded-lg px-3 py-2 text-[12.5px] border leading-relaxed",
          validation.ok
            ? "bg-[#f0fdf4] border-[#bbf7d0] text-[#166534]"
            : "bg-[#fff1f2] border-[#fecdd3] text-[#9f1239]"
        )}>
          {validation.ok
            ? <span>✓ {renderReadsAs(value, codeMap)}</span>
            : <span>✗ {validation.error}</span>
          }
        </div>
      )}

      {!disabled && (
        <>
          {/* Insert test */}
          <div className="flex items-center gap-2">
            <span className="text-[11.5px] font-medium text-[#565869] whitespace-nowrap shrink-0">
              Insert test:
            </span>
            <Combobox
              value={null}
              onChange={code => { if (code) insertAtCursor(code); }}
              options={insertOptions}
              placeholder="Search & pick a test…"
              allowClear={false}
              className="flex-1"
            />
          </div>

          {/* Operator buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {OPERATORS.map(op => (
              <button
                key={op.label}
                type="button"
                onMouseDown={e => { e.preventDefault(); saveCursor(); }}
                onClick={() => insertAtCursor(op.value)}
                className="w-9 h-9 rounded-lg border border-[#e6e7ee] bg-white text-[14px] font-medium text-[#14151c] hover:bg-[#f4f4f8] hover:border-[#c7c9ff] transition-colors"
              >
                {op.label}
              </button>
            ))}
            <button
              type="button"
              onMouseDown={e => { e.preventDefault(); saveCursor(); }}
              onClick={handleBackspace}
              className="w-9 h-9 rounded-lg border border-[#e6e7ee] bg-white text-[13px] text-[#44454e] hover:bg-[#fbe5e5] hover:border-[#d27979] hover:text-[#a31e1e] transition-colors"
            >
              ⌫
            </button>
            <button
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={handleClear}
              className="ml-auto px-3 h-9 rounded-lg border border-[#e6e7ee] bg-white text-[12px] text-[#565869] hover:bg-[#fbe5e5] hover:text-[#a31e1e] transition-colors"
            >
              Clear
            </button>
          </div>
        </>
      )}

      {/* Try it */}
      {referencedCodes.length > 0 && validation.ok && (
        <div className="rounded-xl border border-[#eef0f4] bg-[#fafafe] p-3 space-y-2">
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#565869]">
            Try it
          </p>
          <div className="flex flex-wrap gap-3 items-end">
            {referencedCodes.map(code => (
              <div key={code} className="flex flex-col gap-1">
                <label className="text-[11.5px] font-medium text-[#44454e] truncate max-w-[110px]">
                  {codeMap.get(code)?.name ?? code}
                </label>
                <input
                  type="number"
                  value={trialValues[code] ?? ""}
                  onChange={e => setTrialValues(prev => ({ ...prev, [code]: e.target.value }))}
                  placeholder="0"
                  className="field tabular-nums w-24 !py-1.5 !text-[13px]"
                />
              </div>
            ))}
            <div className="flex flex-col gap-1">
              <label className="text-[11.5px] font-medium text-[#565869]">Result</label>
              <div className="w-24 h-[34px] flex items-center justify-center rounded-lg border border-[#eef0f4] bg-[#f4f4f8] text-[13px] tabular-nums font-semibold text-[#14151c]">
                {trialResult}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
