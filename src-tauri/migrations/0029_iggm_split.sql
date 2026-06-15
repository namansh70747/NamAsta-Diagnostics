-- ============================================================
-- Migration 0029 : Serology — report IgG and IgM as separate lines
-- ============================================================
-- The lab wants Dengue and Chikungunya antibodies reported as two distinct lines (IgG and IgM),
-- each Reactive / Non-Reactive — matching the Typhidot split added in 0026. Typhoid is already
-- split (Salmonella Typhi IgG / IgM in 0026); here we also make that pair billable.
--
-- Safety: reports/result-entry do NOT filter on tests.enabled (only new-order search does), so
-- disabling the old combined "Dengue IgG/IgM" (DENG) does not change any already-reported
-- patient — it only stops the combined dropdown being offered on NEW orders.

-- ── Dengue: three distinct lines — NS1 Antigen, IgM Antibodies, IgG Antibodies — matching the
--    lab's preferred layout. The combined DENG (price 600) is split 300 + 300 across the two
--    antibody lines; NS1 keeps its own price. Order is NS1 → IgM → IgG. ──
UPDATE tests SET name = 'Dengue NS1 Antigen', sort_order = 100 WHERE code = 'NS1';
INSERT OR IGNORE INTO tests(code, name, panel_id, result_type, unit, decimals, price, enabled, sort_order, choices) VALUES
  ('DENGIGM', 'Dengue IgM Antibodies', (SELECT id FROM panels WHERE code='SERO'), 'choice', '—', 0, 300, 1, 101, '["Non-Reactive","Reactive"]'),
  ('DENGIGG', 'Dengue IgG Antibodies', (SELECT id FROM panels WHERE code='SERO'), 'choice', '—', 0, 300, 1, 102, '["Non-Reactive","Reactive"]');

-- ── Chikungunya: same IgM / IgG two-line treatment. Rename the existing "Chikungunya IgM" (CG)
--    to match, and add the IgG line. IgG priced 0 so ordering both does not double-charge
--    (all prices editable in Test Master). Order is IgM → IgG. ──
UPDATE tests SET name = 'Chikungunya IgM Antibodies', sort_order = 105 WHERE code = 'CG';
INSERT OR IGNORE INTO tests(code, name, panel_id, result_type, unit, decimals, price, enabled, sort_order, choices) VALUES
  ('CHIKIGG', 'Chikungunya IgG Antibodies', (SELECT id FROM panels WHERE code='SERO'), 'choice', '—', 0, 0, 1, 106, '["Non-Reactive","Reactive"]');

-- ── Typhoid: the Typhidot split (0026) was priced 0/0; make it billable (150 + 150 = the old
--    combined 300). Guarded so a hand-edited price is never overwritten. ──
UPDATE tests SET price = 150 WHERE code IN ('STYPHIGG', 'STYPHIGM') AND price = 0;

-- Standard dengue interpretation — prints once after the table (kept on the IgM line).
UPDATE tests SET interpretation_note =
  'Dengue IgM antibodies appear 3-5 days after the onset of fever and indicate recent / acute infection. IgG appears later; in secondary dengue IgG may rise early. A negative result does not exclude dengue in the first few days of illness — correlate with the NS1 antigen and the clinical picture.'
  WHERE code = 'DENGIGM';

-- Retire the old combined dropdowns from NEW orders (existing patients keep their result).
UPDATE tests SET enabled = 0 WHERE code IN ('DENG', 'TYPHI');

INSERT OR IGNORE INTO schema_migrations(version) VALUES('0029');
