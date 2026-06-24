import {
  FlaskConical, Layers, Search, Plus, Pencil, IndianRupee,
  FileText, Eye, Send, SlidersHorizontal, ShieldCheck, Check,
  ClipboardList, Save, Settings as SettingsIcon, HelpCircle,
} from "lucide-react";
import type { TutorialStep } from "@/lib/tutorial";

/**
 * Plain-English, picture-led guided tours. Keep every `body` to ONE short, simple
 * sentence — many lab staff don't read English well, so the big icon carries the meaning.
 * Anchors are `[data-tour="…"]` attributes placed on the real screen elements.
 */
export type TourId = "test-master" | "result-entry" | "report" | "settings";

/** Tours bound to a specific screen. `route` is the static path to open before replaying;
 *  patient-bound screens (result entry / report) have no static route — they auto-play when
 *  the user next opens a patient there. */
export const TOURS: Record<TourId, { label: string; route?: string; steps: TutorialStep[] }> = {
  "test-master": {
    label: "Test Master — manage tests & prices",
    route: "/test-master",
    steps: [
      { icon: FlaskConical, title: "Test Master", body: "This is where you keep all your tests and their prices." },
      { target: '[data-tour="tm-panels"]', icon: Layers, title: "Test groups", body: "Tap a group like CBC or LFT to see only those tests." },
      { target: '[data-tour="tm-search"]', icon: Search, title: "Find a test", body: "Type a name or code to find a test quickly." },
      { target: '[data-tour="tm-row"]', icon: Pencil, title: "Open a test", body: "Tap any row to edit the test, its normal range, and notes." },
      { target: '[data-tour="tm-price"]', icon: IndianRupee, title: "Change a price", body: "Tap the price number and type a new price." },
      { target: '[data-tour="tm-add-test"]', icon: Plus, title: "Add a new test", body: "Tap here to create a brand-new test." },
      { target: '[data-tour="tm-manage-panels"]', icon: Layers, title: "Make groups", body: "Create or change test groups (panels) here." },
      { icon: HelpCircle, title: "All done!", body: "Tap the ? button at the top any time to see this again." },
    ],
  },
  "result-entry": {
    label: "Result Entry — type & approve results",
    steps: [
      { icon: ClipboardList, title: "Enter results", body: "Here you type the test results for this patient." },
      { target: '[data-tour="re-results"]', icon: Pencil, title: "Type results", body: "Type each value in its box. It saves by itself." },
      { target: '[data-tour="re-saved"]', icon: Check, title: "Saved automatically", body: "This shows your work is saved — there is no save button to press." },
      { target: '[data-tour="re-editpatient"]', icon: Pencil, title: "Fix patient details", body: "Wrong name or age? Tap the pencil to fix it here." },
      { target: '[data-tour="re-approve"]', icon: ShieldCheck, title: "Approve", body: "When all results are filled, tap Approve to lock it and make the report." },
      { icon: HelpCircle, title: "All done!", body: "Tap the ? button at the top any time to see this again." },
    ],
  },
  report: {
    label: "Report — check, edit & send",
    steps: [
      { icon: FileText, title: "The report", body: "Check the report here, then give it to the patient." },
      { icon: Eye, title: "Preview", body: "The white sheet on the left is exactly how the report will print." },
      { target: '[data-tour="rp-zoom"]', icon: Search, title: "Zoom", body: "Make the preview bigger or smaller to read it." },
      { target: '[data-tour="rp-edit"]', icon: Pencil, title: "Fix the text", body: "Tap here to change any text right on the report." },
      { target: '[data-tour="rp-deliver"]', icon: Send, title: "Send it", body: "Approve first, then Print, save PDF, or send on WhatsApp." },
      { target: '[data-tour="rp-layout"]', icon: SlidersHorizontal, title: "Page settings", body: "Change page gaps and turn the letterhead on or off here." },
      { icon: HelpCircle, title: "All done!", body: "Tap the ? button at the top any time to see this again." },
    ],
  },
  settings: {
    label: "Settings — set up your lab",
    route: "/settings",
    steps: [
      { icon: SettingsIcon, title: "Settings", body: "Set up your lab and the app here." },
      { target: '[data-tour="set-tabs"]', icon: Layers, title: "Sections", body: "Pick a section on the left — lab name, printing, backups, users, and more." },
      { target: '[data-tour="set-save"]', icon: Save, title: "Save changes", body: "After you change anything, tap Save." },
      { icon: HelpCircle, title: "All done!", body: "Tap the ? button at the top any time to see this again." },
    ],
  },
};

/** Map the current route to its tour id (handles dynamic /report/:id, /result-entry/:id). */
export function tourIdForPath(pathname: string): TourId | null {
  if (pathname.startsWith("/test-master")) return "test-master";
  if (pathname.startsWith("/result-entry")) return "result-entry";
  if (pathname.startsWith("/report")) return "report";
  if (pathname.startsWith("/settings")) return "settings";
  return null;
}
