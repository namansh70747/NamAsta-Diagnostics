# SCL Lab App — Design System (STRICT — every page must follow this exactly)

The app must feel like one designer built it: warm, calm, precise. Brand = SCL maroon `#7b1b1b` + navy `#1e3f8f`. Workspace background is warm off-white `#f8f7f5` (set by the shell — pages NEVER set their own page background). Font is Inter Variable (already loaded globally).

## Shared CSS primitives (defined in src/index.css — USE THESE, do not reinvent)
- `.card` — white, radius 14px, hairline shadow. Add `.card-hover` for interactive cards.
- `.field` — every input/select/textarea. Never hand-roll input borders/focus.
- `.btn .btn-primary` (maroon gradient) / `.btn .btn-secondary` (white outline) / `.btn .btn-success` (green, Approve only) / `.btn .btn-ghost`.
- `.chip .chip-gray|amber|green|blue|red` — status chips: registered=gray, results_pending=amber, approved=green, delivered=blue, danger=red.
- `.table-head` — th typography. `.tabular-nums` on ALL numbers/money.
- Animations: `animate-fade-up` for page-level blocks, `animate-scale-in` for dialogs/popovers, `animate-fade-in` for overlays.

## Page anatomy (identical everywhere)
1. NO page h1 (the shell topbar shows the page title). Start with a header row: left = optional context/subtitle (13px `text-[#8a857d]`), right = primary action as `.btn .btn-primary`.
2. Content in `.card` sections, `p-5` or `p-6`, separated by `space-y-4`/`gap-4`. Page root: `pt-4 space-y-4`.
3. Tables: inside a `.card overflow-hidden`. Header row `border-b border-[#f1efec]`, th `px-5 py-3 text-left table-head`. Body rows `border-b border-[#f6f5f3] last:border-0`, td `px-5 py-3 text-[13.5px]`, row hover `hover:bg-[#faf9f7]`. Money right-aligned `tabular-nums`. Actions appear on row hover (`opacity-0 group-hover:opacity-100`).
4. Section labels inside cards: `text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8a857d] mb-3`.
5. Form labels: `block text-[12.5px] font-medium text-[#5d5953] mb-1.5`. Required mark: `<span className="text-maroon-600">*</span>`.
6. Dialogs: overlay `fixed inset-0 z-50 bg-[#1a1208]/40 backdrop-blur-[2px] animate-fade-in flex items-center justify-center p-4`; panel `bg-white rounded-2xl shadow-pop w-full max-w-md p-6 animate-scale-in` (shadow via `style={{boxShadow:'var(--shadow-pop)'}}` or class `shadow-[var(--shadow-pop)]`). Esc + backdrop close.
7. Side sheets: fixed right, `w-[420px] max-w-full h-full bg-white shadow-[var(--shadow-pop)] animate-fade-up`, header with title + ✕.
8. Empty states: centered `py-14`, an icon in a `w-11 h-11 rounded-xl bg-[#f1efec] text-[#8a857d] flex items-center justify-center mx-auto mb-3`, one-line message `text-[13.5px] text-[#8a857d]`, optional `.btn .btn-secondary` CTA. Never a blank area.
9. Loading: skeleton blocks `animate-pulse rounded-lg bg-[#efedea]` matching final layout. Never spinners for local data.
10. Toasts: bottom-right, `bg-[#1d1b18] text-white text-[13px] rounded-xl px-4 py-3 shadow-[var(--shadow-pop)] animate-fade-up`, auto-dismiss 3.5s; error variant adds a red dot. (If page already has a toast util, restyle it to this.)

## Color discipline
- Text: primary `#1a1a1e`, secondary `#5d5953`, muted `#8a857d`. Never pure gray-500/600 utilities — use these hexes.
- Hairlines: `#f1efec` (inside cards), `#e7e5e1` (stronger).
- Maroon ONLY for: primary buttons, active/selected states, links `text-maroon-700 hover:underline`, focus. Never large maroon fills in content.
- Out-of-range: H = `text-[#b91c1c] font-semibold`, L = `text-[#1d4ed8] font-semibold`, A = amber. Subtle row tint `bg-[#fdf6f6]` max — no loud red rows.

## Micro-interactions
- All interactive elements get transitions (the primitives already have them).
- Icons: lucide, size 15–17, strokeWidth 1.8 (2.2 when active/emphasized).
- Numbers that change (totals) wrap in `transition-colors`.
- Keyboard hints shown as `<kbd className="text-[10px] font-semibold text-[#8a857d] bg-[#f1efec] rounded px-1.5 py-0.5">F9</kbd>`.

## Forbidden (these scream template)
- `rounded-xl border border-gray-200` card pattern → use `.card`.
- `bg-maroon-600 hover:bg-maroon-700` raw buttons → use `.btn .btn-primary`.
- `focus:ring-2 focus:ring-maroon-500` inputs → use `.field`.
- Default-blue links, gray-50 table heads, `text-2xl font-bold` page titles inside pages, emoji in UI text.
