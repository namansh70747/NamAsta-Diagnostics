-- ============================================================
-- Migration 0028 : Urine examination — add "Quantity"
-- ============================================================
-- Routine urine reports list Quantity (volume of sample received, in mL) as the first
-- physical-examination line, before Colour / Appearance. Added with a low sort_order (5)
-- so it prints first. Numeric so result-entry shows a number keypad; the field still
-- accepts free text ("Adequate") like the other result fields. No reference range.

INSERT OR IGNORE INTO tests(code, name, panel_id, result_type, unit, decimals, price, enabled, sort_order, choices, default_value) VALUES
  ('U_QTY', 'Quantity', (SELECT id FROM panels WHERE code='URINE'), 'numeric', 'mL', 0, 0, 1, 5, NULL, NULL);

INSERT OR IGNORE INTO schema_migrations(version) VALUES('0028');
