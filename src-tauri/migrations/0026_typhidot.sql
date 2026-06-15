-- ============================================================
-- Migration 0026 : Typhidot — separate Salmonella Typhi IgG / IgM
-- ============================================================
-- The lab reports Typhidot as two lines (IgG and IgM), each Reactive / Non-Reactive, with a
-- standard interpretation note. The existing single "Typhoid IgM/IgG" (TYPHI) choice stays for
-- anyone who prefers one line; these are the explicit two-line version shown on the lab's pad.

INSERT OR IGNORE INTO tests(code, name, panel_id, result_type, unit, decimals, price, enabled, sort_order, choices) VALUES
  ('STYPHIGG', 'Salmonella Typhi IgG', (SELECT id FROM panels WHERE code='SERO'), 'choice', '—', 0, 0, 1, 105, '["Non-Reactive","Reactive"]'),
  ('STYPHIGM', 'Salmonella Typhi IgM', (SELECT id FROM panels WHERE code='SERO'), 'choice', '—', 0, 0, 1, 106, '["Non-Reactive","Reactive"]');

-- Interpretation prints once, after the table (kept on the IgM line).
UPDATE tests SET interpretation_note =
  'Typhi Dot is a rapid test for detection of IgM / IgG antibodies to Salmonella typhi. Accurate diagnosis of typhoid fever at an early stage is important for etiological diagnosis and to identify and treat potential carriers and prevent typhoid fever outbreaks. The conventional Widal test detects antibodies to S. typhi in the patient''s serum from the second week of onset of symptoms, whereas early-rising antibodies (predominantly IgM) detected by Typhi Dot serve as a marker of recent infection.'
  WHERE code='STYPHIGM';

INSERT OR IGNORE INTO schema_migrations(version) VALUES('0026');
