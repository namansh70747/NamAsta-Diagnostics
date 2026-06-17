# Changelog

All notable changes to NamAsta Diagnostics. Newest first.

## v1.3.63

- The report letterhead now shows **only the lab's own uploaded logo** (Settings → Branding).
  The hardcoded "SCL" fallback mark has been removed, so a lab that hasn't uploaded a logo no
  longer shows another company's logo on its reports.

## v1.3.62

- Fixed "Edit report" on a report that already has saved edits: the content no longer collapses
  / slides down and disappears. The editor snapshot is now always normalised to natural top-to-
  bottom flow (stripping any baked-in resize transforms), whether it starts from the saved edit
  or the live report.
- Includes v1.3.61: page stretch reaches exactly down to just above the signature (measured live).

## v1.3.61

- Page stretch now reaches **exactly down to just above the signature**. The ceiling is measured
  live from each page's real frame→signature distance (instead of an off-screen estimate that
  stopped short), so the empty space under a short panel can be fully used — no further, no less.

## v1.3.60

- Page resize can now stretch a short panel **all the way down to just above the signature**,
  using the empty space that was previously wasted. (The old 300% limit stopped well short of
  the signature on short reports.) Tall panels still stay clamped so they never bleed off the page.

## v1.3.59

- Name box now **repeats on every page by default**. A new "Hide name box on page #" field lets
  you name a single page number to omit it on (e.g. page 2 for a long test that continues there).
- Fixed long panels bleeding past the page edge: pages auto-fit with a safety margin and the
  manual page-resize handles can no longer stretch content off the page.
- Smoother editor: drag-selection only recomputes when you cross into a new cell, and column
  resize is frame-throttled.

## v1.3.58

- **Spreadsheet-grade report editor.** "Edit report" now behaves like a real spreadsheet for the
  test tables: click a cell to select it, double-click / F2 / start typing to edit, arrow keys to
  move, Tab/Enter to move on (Excel-style). Drag or Shift+arrows select a block, a column heading
  selects the whole column, Ctrl/⌘+A selects all. Ctrl/⌘+C / X / V copy, cut and paste cell blocks
  (a single copied cell fills a whole selection). Delete clears, Esc deselects.
- Table structure editing: right-click (or the toolbar) to insert / delete rows & columns, clear
  contents, and toggle cell borders. Drag a column heading's right edge to resize. Vertical
  alignment (top / middle / bottom) for selected cells.
- Selection, gridlines and highlights are on-screen only — the printed report, PDF and WhatsApp
  copy stay clean with no grid.
- **Continuation pages.** The patient name box now prints only on the first page; pages 2+ are
  clean continuation pages (letterhead, footer and signature stay, name box omitted) — ideal when
  a long single test runs onto the next page. A "Repeat name box on every page" toggle restores
  the old behaviour.
- Urine report is grouped under PHYSICAL / CHEMICAL / MICROSCOPIC EXAMINATION headings.
- Report preview and the configuration sidebar now scroll independently.

## v1.1.9

- CBC report: abnormal values now bold the **test name** too, not just the result — matching
  the H360's own printout where the full row stands out for out-of-range results.
- PLT histogram x-axis corrected to 0 / 10 / 20 / 30 fL (was 0 / 10 / 20 / 35).

## v1.1.8

- Reports now show all panels together on one page by default — exactly like the old system.
  Tests from different departments (HAEMATOLOGY, BIOCHEMISTRY, etc.) appear in sequence with
  department headings, and a bold underlined panel sub-heading separates panels within the
  same department. A "All panels on one page" toggle in Layout switches back to the old
  one-panel-per-page format.
- CBC histograms are now vertically aligned beside their sections: WBC Histogram sits next to
  LEUKOCYTES, RBC Histogram next to ERYTHROCYTES, PLT Histogram next to THROMBOCYTES —
  matching the H360's own printout. All three histograms now show reference dashed lines.
- Units column widened (was 10%, now 12%) and marked no-wrap — fixes "10^3/µL" breaking
  across two lines on the CBC report.
- PDFs of compact (tall) reports are now correctly paginated: the content is rendered at its
  full height and sliced into A4 pages rather than being clipped at 297mm.

## v1.1.7

- CBC report now shows WBC / RBC / PLT histogram charts to the right of the test table,
  matching the layout of the H360/DH3x own printout. Charts are generated from the patient's
  own differential % (WBC), MCV + RDW-SD (RBC), and MPV + PDW-SD (PLT), so the curve
  shape reflects the actual patient result. Real captured histogram data is used when
  available; synthetic curves are the fallback.

## v1.1.6

- Alkaline Phosphatase (ALP) reference ranges corrected to the lab's validated values:
  0–15 years 210–810 U/L, adults (15+) 100–306 U/L.
  (Previous entries used generic textbook ranges that did not match the lab's practice.)

## v1.1.5

- CBC report now matches the H360's own printed layout: results are grouped under
  LEUKOCYTES / ERYTHROCYTES / THROMBOCYTES section headers with a divider line, and
  out-of-range values are printed in bold (no ↑H / ↓L text — just bold), exactly as the
  machine's own printout shows.

## v1.1.4

- Reports no longer print High / Low (↑H ↓L) flags or abnormal-value bolding — the result
  column is clean. (Flags are still computed and stored internally; they just aren't shown.)
- Widal is now reported in full: the four agglutinin-titre lines (S. Typhi "O" & "H",
  S. Paratyphi "AH" & "BH", each selectable 1:20 → 1:640) plus separate Widal IgG / IgM lines.
  The existing "Widal Test" / "Widal Test (Tube Method)" stay as the billable items.

## v1.1.3

- Settings → Analyzer → Capture raw: added a "Copy all" button on the raw-output box (and the
  text is now one-click select-all), so the machine's raw transmission can be copied easily for
  support / format checks.

## v1.1.2

- Analyzer capture no longer cuts off early. The cell counter sends the numeric results, then
  pauses while it renders the histogram, then sends it — the old 2-second idle timeout ended the
  capture in that gap (losing the graphs and the last few values). It now waits up to 12 seconds
  of silence (and stops instantly when the machine closes the connection), so the full
  transmission — including the histogram — comes through.

## v1.1.1

- CBC analyzer now reads the Dymind DH3x (and other HL7 v2 cell counters). Previously the app
  only understood ASTM "R|" records, so it received the data but matched zero parameters
  ("Data received, but no parameters matched"). It now parses HL7 OBX result lines (WBC, HGB,
  RBC, PLT, LYM%/GRAN%/MID% and the rest), which map straight onto the lab's CBC test codes.

## v1.1.0

- Editable reports: an "Edit report" button on the report preview makes it editable like a
  document — change/add/delete any text, then Save. The edited version is stored and is what
  prints, WhatsApps and emails. "Revert to original" restores the auto-generated report.
- Approve with blanks: you no longer have to fill every ordered test. Approve any time; tests
  left blank are simply omitted from the printed report (they don't show as empty rows).

## v1.0.9

- "Read from analyzer": when the H360 sends data that doesn't match the patient's ordered tests,
  the app now shows the exact raw text the machine sent in a dialog with a "Copy raw text" button,
  instead of a dead-end error. Makes it easy to capture an analyzer's format for support without
  the timed Settings → Analyzer capture.

## v1.0.8

- Reports now print only the tests that have a value — blank / un-entered rows (and any panel
  whose tests are all blank) are left off the printed report.
- Report table columns balanced: Test Name and Normal Ranges are equal width, closing the wide
  gap between Test Name and Results.
- Result-entry fields accept text as well as numbers (Trace, <5, "1.2 (repeat)", etc.).
- Added Typhidot as two lines — Salmonella Typhi IgG and IgM (Reactive / Non-Reactive) — with
  the standard interpretation note.

## v1.0.7

- Analyzer setup: "This PC's IP" now lists every network address the PC has (e.g. the Wi-Fi
  card AND the wired card connected to the analyzer), instead of guessing one — so you can
  pick the address on the analyzer's network. The old guess showed the internet card, which
  on a dual-network lab PC is the wrong one for the H360.

## v1.0.6

- Fix the app freezing ("not responding") during "Read from analyzer", and during email /
  WhatsApp / SMS sends and backups. Those native operations ran on the UI thread and blocked
  it for the whole network/serial window; they now run on a background thread.
- Result-entry fields accept text as well as numbers (e.g. "Trace", "<5", "1.2 (repeat)").
  Numeric tests still get a number keypad and H/L flags read the numeric part.
- Report table: Test Name and Normal Ranges columns are now equal width with a fixed layout,
  tightening the gap between Test Name and Results.

## v1.0.5

- Enable Ctrl +/− (and Ctrl+0) zoom on Windows — the webview zoom hotkeys were off by default,
  so zooming out to fit a small screen did nothing.
- Fuller app icon so it stays crisp and legible at small Windows taskbar sizes (the previous
  macOS-style icon had large transparent margins that made the mark tiny on Windows).

## v1.0.4

- Actually fix scrolling on small / 1366×768 / display-scaled screens. `body` had
  `overflow:hidden`, so any page taller than the screen (the onboarding "Set up your lab"
  form, login) was clipped with no way to scroll to the fields/buttons at the bottom. The
  window now scrolls vertically when a page is taller than the viewport; the app shell still
  scrolls inside itself. (v1.0.3 only resized the window — the content still couldn't scroll.)

## v1.0.3

- Fix the window not fitting / not scrolling on smaller or display-scaled laptops (e.g.
  1366×768 or 125–150% scaling): the window now opens maximized and allows a much smaller
  minimum size, so its bottom edge can't fall off-screen. Also made the login screen scroll
  on short windows instead of clipping its content.

## v1.0.2

- App icon: transparent corners restored (v1.0.1 rendered the squircle on an opaque white
  square because the rasterizer flattened transparency). Icons now build straight from the
  SVG via Tauri/resvg, so the corners are properly transparent — like every other macOS app.

## v1.0.1

- Fix the app icon: a proper macOS-style rounded "squircle" with the NamAsta blood-tube mark
  centred and correct margins (the v1.0.0 icon rendered as a tiny mark in a blank square).

## v1.0.0 — first public release

- Production release: signed Windows installer + automatic in-app updates over GitHub Releases.
- Offline-first lab management: patient registration, result entry with age/sex reference
  ranges, approval-locked reports, and WhatsApp / email / SMS / print delivery.
- Device-locked offline activation keys (up to 2 PCs per key); ₹5,000 first year, ₹1,000 renewal.
- Daily dual backups, audit trail, role-based access (admin / technician).
- Keyboard-first entry (↑/↓ to move between fields) and per-age-group units on reports.
