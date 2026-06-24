import { useState } from "react";
import { Panel, Test } from "@/types";
import { Sheet } from "./Overlays";
import { TestDetailsTab, TestRangesTab, TestInterpretationTab } from "./TestEditorTabs";
import { cn } from "@/lib/utils";
import { Lock } from "lucide-react";

type Tab = "details" | "ranges" | "interpretation";

export function TestSheet({
  test,
  panels,
  canEditTests,
  canEditRanges,
  onClose,
  onSuccess,
  onError,
}: {
  test: Test;
  panels: Panel[];
  canEditTests: boolean;
  canEditRanges: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [tab, setTab] = useState<Tab>("details");

  return (
    <Sheet
      title={test.name}
      chip={test.code}
      subtitle={test.panel_code ?? undefined}
      onClose={onClose}
      header={
        <div className="flex gap-1 border-b border-[#eef0f4] px-5 shrink-0">
          {(["details", "ranges", "interpretation"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "px-3 py-2.5 text-[13px] font-medium capitalize border-b-2 -mb-px transition-colors",
                tab === t
                  ? "border-maroon-600 text-[#14151c]"
                  : "border-transparent text-[#565869] hover:text-[#44454e]"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      }
    >
      {!canEditTests && (
        <div className="flex items-center gap-2 mb-4 rounded-lg bg-[#fdf0d7]/60 px-3 py-2 text-[12px] text-[#92600a]">
          <Lock size={13} strokeWidth={1.8} /> Read-only — editing requires elevated access.
        </div>
      )}
      {tab === "details" && (
        <TestDetailsTab test={test} panels={panels} canEdit={canEditTests} onSuccess={onSuccess} onError={onError} />
      )}
      {tab === "ranges" && (
        <TestRangesTab test={test} canEdit={canEditRanges} onSuccess={onSuccess} onError={onError} />
      )}
      {tab === "interpretation" && (
        <TestInterpretationTab test={test} canEdit={canEditTests} onSuccess={onSuccess} onError={onError} />
      )}
    </Sheet>
  );
}
