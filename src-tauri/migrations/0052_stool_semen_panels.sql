-- 0052_stool_semen_panels: turn STOOL and SEMEN from single free-text tests into structured
-- multi-parameter panels, modeled exactly on URINE (bundle test is_panel=1 + member tests +
-- per-test normal ranges). A bundle test expands to ALL enabled is_panel=0 members of its panel on
-- order (createPatient handles is_panel=1), so the technician orders one item ("Stool Examination" /
-- "Semen Analysis") and gets every parameter pre-filled with its normal value, ready to adjust.
-- The report groups members into sub-sections (see STOOL_SECTION / SEMEN_SECTION in ReportPreviewPage).
--
-- Choice fields prefill via default_value; the same normal is stored as range_text so it prints in the
-- report's reference column. Numeric fields stay empty with a numeric range_text reference.

-- ============================================================
-- STOOL  (panel 'STOOL' already exists: report_heading 'STOOL EXAMINATION')
-- ============================================================

-- Retire the old single flat test; the new bundle replaces it.
UPDATE tests SET enabled = 0, updated_at = CURRENT_TIMESTAMP WHERE code = 'STOOL_EXAM';

-- Sellable bundle → one bill line, expands into the members below.
INSERT OR IGNORE INTO tests(code, name, panel_id, result_type, unit, decimals, price, enabled, sort_order, is_panel)
SELECT 'STOOLP', 'Stool Examination', id, 'text', '', 0, 50, 1, 0, 1 FROM panels WHERE code='STOOL';

-- Member tests (is_panel=0). sort_order groups them: PHYSICAL (10-60), CHEMICAL (70-80), MICROSCOPIC (90+).
INSERT OR IGNORE INTO tests(code, name, panel_id, result_type, unit, decimals, price, enabled, sort_order, choices, default_value) VALUES
  -- PHYSICAL EXAMINATION
  ('STOOL_COLOUR',       'Colour',                 (SELECT id FROM panels WHERE code='STOOL'), 'choice',  '—', 0, 0, 1,  10, '["Brown","Pale Yellow","Yellow","Greenish","Dark Brown","Black","Clay Coloured"]', 'Brown'),
  ('STOOL_CONSIST',      'Consistency',            (SELECT id FROM panels WHERE code='STOOL'), 'choice',  '—', 0, 0, 1,  20, '["Formed","Semi Solid","Soft","Loose","Watery","Hard","Mucoid"]', 'Semi Solid'),
  ('STOOL_MUCUS',        'Mucous',                 (SELECT id FROM panels WHERE code='STOOL'), 'choice',  '—', 0, 0, 1,  30, '["Absent","Present"]', 'Absent'),
  ('STOOL_BLOOD',        'Blood (Gross)',          (SELECT id FROM panels WHERE code='STOOL'), 'choice',  '—', 0, 0, 1,  40, '["Absent","Present"]', 'Absent'),
  ('STOOL_WORMS',        'Worms (Adult/Segment)',  (SELECT id FROM panels WHERE code='STOOL'), 'choice',  '—', 0, 0, 1,  50, '["Absent","Present"]', 'Absent'),
  ('STOOL_PH',           'pH',                     (SELECT id FROM panels WHERE code='STOOL'), 'numeric', '',  1, 0, 1,  60, NULL, NULL),
  -- CHEMICAL EXAMINATION
  ('STOOL_OCCULT',       'Occult Blood',           (SELECT id FROM panels WHERE code='STOOL'), 'choice',  '—', 0, 0, 1,  70, '["Negative","Positive"]', 'Negative'),
  ('STOOL_REDUCING',     'Reducing Substances',    (SELECT id FROM panels WHERE code='STOOL'), 'choice',  '—', 0, 0, 1,  80, '["Negative","Positive"]', 'Negative'),
  -- MICROSCOPIC EXAMINATION
  ('STOOL_CYST',         'Cyst',                   (SELECT id FROM panels WHERE code='STOOL'), 'choice',  '—', 0, 0, 1,  90, '["Not Seen","Present"]', 'Not Seen'),
  ('STOOL_OVA',          'Ova',                    (SELECT id FROM panels WHERE code='STOOL'), 'choice',  '—', 0, 0, 1, 100, '["Not Seen","Present"]', 'Not Seen'),
  ('STOOL_PUS',          'Pus Cells (WBC)',        (SELECT id FROM panels WHERE code='STOOL'), 'numeric', '/hpf', 0, 0, 1, 110, NULL, NULL),
  ('STOOL_FLAGELLATES',  'Flagellates',            (SELECT id FROM panels WHERE code='STOOL'), 'choice',  '—', 0, 0, 1, 120, '["Not Seen","Present"]', 'Not Seen'),
  ('STOOL_TROPHOZOITES', 'Trophozoites',           (SELECT id FROM panels WHERE code='STOOL'), 'choice',  '—', 0, 0, 1, 130, '["Not Seen","Present"]', 'Not Seen'),
  ('STOOL_RBC',          'Red Blood Cells (RBC)',  (SELECT id FROM panels WHERE code='STOOL'), 'choice',  '—', 0, 0, 1, 140, '["Not Seen","Present"]', 'Not Seen'),
  ('STOOL_ECOLI',        'E. Coli',                (SELECT id FROM panels WHERE code='STOOL'), 'choice',  '—', 0, 0, 1, 150, '["Not Seen","Present"]', 'Not Seen'),
  ('STOOL_EHISTO',       'E. Histolytica',         (SELECT id FROM panels WHERE code='STOOL'), 'choice',  '—', 0, 0, 1, 160, '["Not Seen","Present"]', 'Not Seen'),
  ('STOOL_GIARDIA',      'Giardia',                (SELECT id FROM panels WHERE code='STOOL'), 'choice',  '—', 0, 0, 1, 170, '["Not Seen","Present"]', 'Not Seen'),
  ('STOOL_HOOKWORM',     'Hookworm',               (SELECT id FROM panels WHERE code='STOOL'), 'choice',  '—', 0, 0, 1, 180, '["Not Seen","Present"]', 'Not Seen'),
  ('STOOL_HNANA',        'H. Nana',                (SELECT id FROM panels WHERE code='STOOL'), 'choice',  '—', 0, 0, 1, 190, '["Not Seen","Present"]', 'Not Seen'),
  ('STOOL_ASCARIS',      'Ascaris',                (SELECT id FROM panels WHERE code='STOOL'), 'choice',  '—', 0, 0, 1, 200, '["Not Seen","Present"]', 'Not Seen');

-- STOOL normal ranges (range_text prints in the report's reference column).
INSERT OR IGNORE INTO test_ranges(test_id, sex, range_text) SELECT id, 'ANY', 'Brown'      FROM tests WHERE code='STOOL_COLOUR';
INSERT OR IGNORE INTO test_ranges(test_id, sex, range_text) SELECT id, 'ANY', 'Semi Solid' FROM tests WHERE code='STOOL_CONSIST';
INSERT OR IGNORE INTO test_ranges(test_id, sex, range_text) SELECT id, 'ANY', 'Absent'     FROM tests WHERE code='STOOL_MUCUS';
INSERT OR IGNORE INTO test_ranges(test_id, sex, range_text) SELECT id, 'ANY', 'Absent'     FROM tests WHERE code='STOOL_BLOOD';
INSERT OR IGNORE INTO test_ranges(test_id, sex, range_text) SELECT id, 'ANY', 'Absent'     FROM tests WHERE code='STOOL_WORMS';
INSERT OR IGNORE INTO test_ranges(test_id, sex, range_text) SELECT id, 'ANY', 'Negative'   FROM tests WHERE code='STOOL_OCCULT';
INSERT OR IGNORE INTO test_ranges(test_id, sex, range_text) SELECT id, 'ANY', 'Negative'   FROM tests WHERE code='STOOL_REDUCING';
INSERT OR IGNORE INTO test_ranges(test_id, sex, range_text) SELECT id, 'ANY', 'Not Seen'   FROM tests WHERE code='STOOL_CYST';
INSERT OR IGNORE INTO test_ranges(test_id, sex, range_text) SELECT id, 'ANY', 'Not Seen'   FROM tests WHERE code='STOOL_OVA';
INSERT OR IGNORE INTO test_ranges(test_id, sex, high, range_text) SELECT id, 'ANY', 5, '0 - 5' FROM tests WHERE code='STOOL_PUS';
INSERT OR IGNORE INTO test_ranges(test_id, sex, range_text) SELECT id, 'ANY', 'Absent'     FROM tests WHERE code='STOOL_FLAGELLATES';
INSERT OR IGNORE INTO test_ranges(test_id, sex, range_text) SELECT id, 'ANY', 'Absent'     FROM tests WHERE code='STOOL_TROPHOZOITES';
INSERT OR IGNORE INTO test_ranges(test_id, sex, range_text) SELECT id, 'ANY', 'Not Seen'   FROM tests WHERE code='STOOL_RBC';
INSERT OR IGNORE INTO test_ranges(test_id, sex, range_text) SELECT id, 'ANY', 'Not Seen'   FROM tests WHERE code='STOOL_ECOLI';
INSERT OR IGNORE INTO test_ranges(test_id, sex, range_text) SELECT id, 'ANY', 'Not Seen'   FROM tests WHERE code='STOOL_EHISTO';
INSERT OR IGNORE INTO test_ranges(test_id, sex, range_text) SELECT id, 'ANY', 'Not Seen'   FROM tests WHERE code='STOOL_GIARDIA';
INSERT OR IGNORE INTO test_ranges(test_id, sex, range_text) SELECT id, 'ANY', 'Not Seen'   FROM tests WHERE code='STOOL_HOOKWORM';
INSERT OR IGNORE INTO test_ranges(test_id, sex, range_text) SELECT id, 'ANY', 'Not Seen'   FROM tests WHERE code='STOOL_HNANA';
INSERT OR IGNORE INTO test_ranges(test_id, sex, range_text) SELECT id, 'ANY', 'Not Seen'   FROM tests WHERE code='STOOL_ASCARIS';

-- ============================================================
-- SEMEN  (new dedicated panel; the old 'SEMEN' test lived inside FLUID)
-- ============================================================

-- Dedicated panel, just after URINE/STOOL.
INSERT OR IGNORE INTO panels(code, name, report_heading, sort_order, page_break_after)
VALUES ('SEMEN', 'SEMEN ANALYSIS', 'SEMEN ANALYSIS', 56, 0);

-- Retire the old single flat test (it was a member of FLUID).
UPDATE tests SET enabled = 0, updated_at = CURRENT_TIMESTAMP WHERE code = 'SEMEN';

-- Sellable bundle.
INSERT OR IGNORE INTO tests(code, name, panel_id, result_type, unit, decimals, price, enabled, sort_order, is_panel)
SELECT 'SEMENP', 'Semen Analysis', id, 'text', '', 0, 200, 1, 0, 1 FROM panels WHERE code='SEMEN';

-- Member tests. sort_order groups: PHYSICAL (10-30), COUNT & MOTILITY (40-80), MORPHOLOGY (90-130), MICROSCOPIC (140+).
INSERT OR IGNORE INTO tests(code, name, panel_id, result_type, unit, decimals, price, enabled, sort_order, choices, default_value) VALUES
  -- PHYSICAL EXAMINATION
  ('SEM_VOLUME',    'Volume',                      (SELECT id FROM panels WHERE code='SEMEN'), 'numeric', 'ml',          1, 0, 1,  10, NULL, NULL),
  ('SEM_COLOUR',    'Colour',                      (SELECT id FROM panels WHERE code='SEMEN'), 'choice',  '—',           0, 0, 1,  20, '["Grayish White","White","Yellowish"]', 'Grayish White'),
  ('SEM_LIQTIME',   'Liquefaction Time',           (SELECT id FROM panels WHERE code='SEMEN'), 'numeric', 'min',         0, 0, 1,  30, NULL, NULL),
  -- SPERM COUNT & MOTILITY
  ('SEM_COUNT',     'Total Sperm Count',           (SELECT id FROM panels WHERE code='SEMEN'), 'numeric', 'millions/ml', 1, 0, 1,  40, NULL, NULL),
  ('SEM_MOTILITY',  'Motility',                    (SELECT id FROM panels WHERE code='SEMEN'), 'numeric', '%',           0, 0, 1,  50, NULL, NULL),
  ('SEM_HIGHMOTILE','Highly Motile',               (SELECT id FROM panels WHERE code='SEMEN'), 'numeric', '%',           0, 0, 1,  60, NULL, NULL),
  ('SEM_SLUGGISH',  'Sluggish',                    (SELECT id FROM panels WHERE code='SEMEN'), 'numeric', '%',           0, 0, 1,  70, NULL, NULL),
  ('SEM_DEAD',      'Dead',                        (SELECT id FROM panels WHERE code='SEMEN'), 'numeric', '%',           0, 0, 1,  80, NULL, NULL),
  -- MORPHOLOGY
  ('SEM_NORMAL',    'Normal',                      (SELECT id FROM panels WHERE code='SEMEN'), 'numeric', '%',           0, 0, 1,  90, NULL, NULL),
  ('SEM_ABNORMAL',  'Abnormal',                    (SELECT id FROM panels WHERE code='SEMEN'), 'numeric', '%',           0, 0, 1, 100, NULL, NULL),
  ('SEM_TAIL',      'Tail Defects',                (SELECT id FROM panels WHERE code='SEMEN'), 'text',    '—',           0, 0, 1, 110, NULL, NULL),
  ('SEM_NECK',      'Neck and Mid Piece Defects',  (SELECT id FROM panels WHERE code='SEMEN'), 'text',    '—',           0, 0, 1, 120, NULL, NULL),
  ('SEM_HEADLESS',  'Headless ''Pin Head''',       (SELECT id FROM panels WHERE code='SEMEN'), 'text',    '—',           0, 0, 1, 130, NULL, NULL),
  -- MICROSCOPIC EXAMINATION
  ('SEM_PUS',       'Pus Cells',                   (SELECT id FROM panels WHERE code='SEMEN'), 'text',    '/hpf',        0, 0, 1, 140, NULL, NULL),
  ('SEM_RBC',       'RBCs',                        (SELECT id FROM panels WHERE code='SEMEN'), 'choice',  '—',           0, 0, 1, 150, '["Not Seen","Present"]', 'Not Seen'),
  ('SEM_EPITH',     'Epithelial Cells',            (SELECT id FROM panels WHERE code='SEMEN'), 'choice',  '—',           0, 0, 1, 160, '["Not Seen","Present"]', 'Not Seen');

-- SEMEN normal ranges.
INSERT OR IGNORE INTO test_ranges(test_id, sex, low, high, range_text) SELECT id, 'ANY', 2.0,  5.0,  '2.0 - 5.0'    FROM tests WHERE code='SEM_VOLUME';
INSERT OR IGNORE INTO test_ranges(test_id, sex, range_text)            SELECT id, 'ANY', 'Grayish White'             FROM tests WHERE code='SEM_COLOUR';
INSERT OR IGNORE INTO test_ranges(test_id, sex, low, high, range_text) SELECT id, 'ANY', 30,   60,   '30 - 60'      FROM tests WHERE code='SEM_LIQTIME';
INSERT OR IGNORE INTO test_ranges(test_id, sex, low, high, range_text) SELECT id, 'ANY', 60,   120,  '60 - 120'     FROM tests WHERE code='SEM_COUNT';
INSERT OR IGNORE INTO test_ranges(test_id, sex, low, high, range_text) SELECT id, 'ANY', 60.0, 75.0, '60.0 - 75.0'  FROM tests WHERE code='SEM_HIGHMOTILE';
INSERT OR IGNORE INTO test_ranges(test_id, sex, low, high, range_text) SELECT id, 'ANY', 10.0, 15.0, '10.0 - 15.0'  FROM tests WHERE code='SEM_SLUGGISH';
INSERT OR IGNORE INTO test_ranges(test_id, sex, low, high, range_text) SELECT id, 'ANY', 10.0, 20.0, '10.0 - 20.0'  FROM tests WHERE code='SEM_DEAD';
INSERT OR IGNORE INTO test_ranges(test_id, sex, range_text)            SELECT id, 'ANY', 'Not Seen'                  FROM tests WHERE code='SEM_RBC';
INSERT OR IGNORE INTO test_ranges(test_id, sex, range_text)            SELECT id, 'ANY', 'Not Seen'                  FROM tests WHERE code='SEM_EPITH';

INSERT OR IGNORE INTO schema_migrations(version) VALUES('0052');
