-- ============================================================
-- SCL Lab App  –  Migration 0003 : Sellable panel bundles + orphan cleanup
-- ============================================================

-- ── 1. Clean up orphan patients left behind by the pre-fix receipt bug ──
-- (a patient with zero orders and zero bills is unusable junk; real patients
--  always have at least one order). Dependent rows go first — FKs are ON.
DELETE FROM report_comments
WHERE patient_id NOT IN (SELECT DISTINCT patient_id FROM orders)
  AND patient_id NOT IN (SELECT DISTINCT patient_id FROM bills);

DELETE FROM delivery_log
WHERE patient_id NOT IN (SELECT DISTINCT patient_id FROM orders)
  AND patient_id NOT IN (SELECT DISTINCT patient_id FROM bills);

DELETE FROM patients
WHERE id NOT IN (SELECT DISTINCT patient_id FROM orders)
  AND id NOT IN (SELECT DISTINCT patient_id FROM bills);

-- ── 2. Sellable bundle tests (§5.7): one bill line, expands into the panel's
--       member tests for result entry. is_panel=1 marks them. ──
INSERT OR IGNORE INTO tests(code, name, panel_id, result_type, unit, decimals, price, enabled, sort_order, is_panel) VALUES
  ('CBC',     'Complete Blood Count (CBC)',     (SELECT id FROM panels WHERE code='CBC'),   'text', '', 0, 250, 1, 0, 1),
  ('LFTP',    'Liver Function Test (LFT)',      (SELECT id FROM panels WHERE code='LFT'),   'text', '', 0, 400, 1, 0, 1),
  ('LIPIDP',  'Lipid Profile',                  (SELECT id FROM panels WHERE code='LIPID'), 'text', '', 0, 300, 1, 0, 1),
  ('KFTP',    'Renal Function Test (RFT/KFT)',  (SELECT id FROM panels WHERE code='KFT'),   'text', '', 0, 300, 1, 0, 1),
  ('TFTP',    'Thyroid Profile (T3,T4,TSH)',    (SELECT id FROM panels WHERE code='THY'),   'text', '', 0, 600, 1, 0, 1),
  ('URINEP',  'Urine Examination (Complete)',   (SELECT id FROM panels WHERE code='URINE'), 'text', '', 0,  50, 1, 0, 1);

-- ── 3. Settings hygiene: strip duplicated prefixes if present ──
UPDATE settings SET value = TRIM(REPLACE(value, 'Equipped With ', ''))
  WHERE key='equipment_line' AND value LIKE 'Equipped With %';
UPDATE settings SET value = TRIM(SUBSTR(value, 5))
  WHERE key='phones' AND (value LIKE 'Mob:%' OR value LIKE 'Mob %');

INSERT OR IGNORE INTO schema_migrations(version) VALUES('0003');
