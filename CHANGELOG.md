# Changelog

All notable changes to NamAsta Diagnostics. Newest first.

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
