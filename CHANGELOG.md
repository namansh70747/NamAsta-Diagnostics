# Changelog

All notable changes to NamAsta Diagnostics. Newest first.

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
