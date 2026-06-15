-- ============================================================
-- Migration 0030 : Widal — structured O/H titres + IgG/IgM lines
-- ============================================================
-- The lab wants the Widal reported as the standard four agglutinin-titre lines
-- (S. Typhi O & H, S. Paratyphi AH & BH) AND a separate IgG / IgM pair. These are added as
-- individual result lines in the SERO panel so they print as distinct rows.
--
-- Pricing: the four titre lines + IgG/IgM are priced 0 (report/result lines). The existing
-- "Widal Test" (WIDAL, slide) and "Widal Test (Tube Method)" (WIDALT) stay as the billable
-- items. All prices are editable in Test Master, and a one-click Widal profile can be wired
-- later if desired.

INSERT OR IGNORE INTO tests(code, name, panel_id, result_type, unit, decimals, price, enabled, sort_order, choices) VALUES
  ('WIDAL_TO',  'S. Typhi "O"',       (SELECT id FROM panels WHERE code='SERO'), 'choice', '—', 0, 0, 1, 11, '["Non-Reactive","1:20","1:40","1:80","1:160","1:320","1:640"]'),
  ('WIDAL_TH',  'S. Typhi "H"',       (SELECT id FROM panels WHERE code='SERO'), 'choice', '—', 0, 0, 1, 12, '["Non-Reactive","1:20","1:40","1:80","1:160","1:320","1:640"]'),
  ('WIDAL_PAH', 'S. Paratyphi "AH"',  (SELECT id FROM panels WHERE code='SERO'), 'choice', '—', 0, 0, 1, 13, '["Non-Reactive","1:20","1:40","1:80","1:160","1:320","1:640"]'),
  ('WIDAL_PBH', 'S. Paratyphi "BH"',  (SELECT id FROM panels WHERE code='SERO'), 'choice', '—', 0, 0, 1, 14, '["Non-Reactive","1:20","1:40","1:80","1:160","1:320","1:640"]'),
  ('WIDAL_IGG', 'Widal IgG',          (SELECT id FROM panels WHERE code='SERO'), 'choice', '—', 0, 0, 1, 16, '["Non-Reactive","Reactive"]'),
  ('WIDAL_IGM', 'Widal IgM',          (SELECT id FROM panels WHERE code='SERO'), 'choice', '—', 0, 0, 1, 17, '["Non-Reactive","Reactive"]');

INSERT OR IGNORE INTO schema_migrations(version) VALUES('0030');
