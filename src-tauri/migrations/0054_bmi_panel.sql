-- 0054_bmi_panel
-- ============================================================
-- Adds a safe, orderable Body Mass Index profile:
--   Height (cm) + Weight (kg) -> BMI (kg/m²) -> age-appropriate category.
--
-- Adult category thresholds follow CDC guidance for adults aged 20 years and older.
-- Children and teens must not be classified with adult cut-offs; the calculation engine
-- therefore returns an explicit pediatric-assessment message for patients under 20.
--
-- Safety:
--   • Namespaced input/category codes avoid collisions with ordinary lab tests.
--   • Existing hand-built rows with these codes keep their names and prices; only the
--     panel wiring, units, types and formulas are repaired.
--   • No patient, order, result, billing, analyzer or settings data is modified.

INSERT OR IGNORE INTO panels(code, name, report_heading, sort_order, page_break_after)
VALUES ('BMI', 'Body Mass Index (BMI)', 'BODY MASS INDEX (BMI)', 95, 0);

INSERT OR IGNORE INTO tests(
  code, name, panel_id, result_type, unit, decimals, price, enabled, sort_order,
  formula, interpretation_note, is_panel
) VALUES
  ('BMI_HT_CM', 'Height',
    (SELECT id FROM panels WHERE code='BMI'), 'numeric', 'cm', 1, 0, 1, 10,
    NULL, NULL, 0),
  ('BMI_WT_KG', 'Weight',
    (SELECT id FROM panels WHERE code='BMI'), 'numeric', 'kg', 1, 0, 1, 20,
    NULL, NULL, 0),
  ('BMI_VALUE', 'Body Mass Index (BMI)',
    (SELECT id FROM panels WHERE code='BMI'), 'calculated', 'kg/m²', 1, 0, 1, 30,
    'BMI_WT_KG / ((BMI_HT_CM / 100) * (BMI_HT_CM / 100))',
    'BMI is a screening measure and should be considered with other clinical factors. For adults aged 20 years and older: underweight <18.5; healthy weight 18.5 to <25; overweight 25 to <30; obesity >=30 kg/m². For ages 2 to 19, use sex- and age-specific BMI-for-age percentiles.',
    0),
  ('BMI_CLASS', 'BMI Category',
    (SELECT id FROM panels WHERE code='BMI'), 'calculated', '', 0, 0, 1, 40,
    'BMI_VALUE', NULL, 0);

-- Repair the wiring of a hand-built equivalent without changing its display name or price.
UPDATE tests SET panel_id=(SELECT id FROM panels WHERE code='BMI'),
       result_type='numeric', unit='cm', decimals=1, enabled=1, sort_order=10,
       formula=NULL, is_panel=0, updated_at=CURRENT_TIMESTAMP
 WHERE code='BMI_HT_CM';
UPDATE tests SET panel_id=(SELECT id FROM panels WHERE code='BMI'),
       result_type='numeric', unit='kg', decimals=1, enabled=1, sort_order=20,
       formula=NULL, is_panel=0, updated_at=CURRENT_TIMESTAMP
 WHERE code='BMI_WT_KG';
UPDATE tests SET panel_id=(SELECT id FROM panels WHERE code='BMI'),
       result_type='calculated', unit='kg/m²', decimals=1, enabled=1, sort_order=30,
       formula='BMI_WT_KG / ((BMI_HT_CM / 100) * (BMI_HT_CM / 100))', is_panel=0,
       interpretation_note=COALESCE(NULLIF(interpretation_note, ''),
         'BMI is a screening measure and should be considered with other clinical factors. For adults aged 20 years and older: underweight <18.5; healthy weight 18.5 to <25; overweight 25 to <30; obesity >=30 kg/m². For ages 2 to 19, use sex- and age-specific BMI-for-age percentiles.'),
       updated_at=CURRENT_TIMESTAMP
 WHERE code='BMI_VALUE';
UPDATE tests SET panel_id=(SELECT id FROM panels WHERE code='BMI'),
       result_type='calculated', unit='', decimals=0, enabled=1, sort_order=40,
       formula='BMI_VALUE', is_panel=0, updated_at=CURRENT_TIMESTAMP
 WHERE code='BMI_CLASS';

-- The adult healthy-weight band drives the existing H/L flagging. Pediatric patients have no
-- matching adult range, so they cannot accidentally receive an adult H/L flag.
INSERT INTO test_ranges(test_id, sex, age_min_days, age_max_days, low, high, range_text)
SELECT t.id, 'ANY', 7305, 54750, 18.5, 24.9, '18.5 - <25.0 (adults 20+)'
  FROM tests t
 WHERE t.code='BMI_VALUE'
   AND NOT EXISTS (SELECT 1 FROM test_ranges r WHERE r.test_id=t.id);

-- Sellable bundle. Price intentionally starts at zero so adding the migration never changes a
-- lab's charges; the administrator can set the local price in Test Master before using it.
INSERT OR IGNORE INTO tests(
  code, name, panel_id, result_type, unit, decimals, price, enabled, sort_order, is_panel
)
SELECT 'BMIP', 'Body Mass Index (BMI)', id, 'text', '', 0, 0, 1, 0, 1
  FROM panels WHERE code='BMI';

UPDATE tests SET panel_id=(SELECT id FROM panels WHERE code='BMI'),
       result_type='text', unit='', decimals=0, enabled=1, sort_order=0, is_panel=1,
       updated_at=CURRENT_TIMESTAMP
 WHERE code='BMIP';

INSERT OR IGNORE INTO schema_migrations(version) VALUES('0054');
