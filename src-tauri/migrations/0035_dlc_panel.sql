-- 0035_dlc_panel: add individual DLC tests (Neutrophils, Lymphocytes, Monocytes,
--   Eosinophils, Basophils) as a proper panel, replacing the old single-text DLC field.

-- 1. Disable the old single-text DLC entry
UPDATE tests SET enabled = 0 WHERE code = 'DLC';

-- 2. Create the DLC panel
INSERT OR IGNORE INTO panels(code, name, report_heading, sort_order, page_break_after)
VALUES ('DLCP', 'DIFFERENTIAL LEUKOCYTE COUNT (DLC)', 'DIFFERENTIAL LEUKOCYTE COUNT (DLC)', 13, 0);

-- 3. Individual DLC tests
INSERT OR IGNORE INTO tests(code, name, panel_id, result_type, unit, decimals, price, enabled, sort_order)
SELECT 'DLC_NEUT',  'Neutrophils',  id, 'numeric', '%', 0, 0, 1, 10 FROM panels WHERE code = 'DLCP';

INSERT OR IGNORE INTO tests(code, name, panel_id, result_type, unit, decimals, price, enabled, sort_order)
SELECT 'DLC_LYMPH', 'Lymphocytes',  id, 'numeric', '%', 0, 0, 1, 20 FROM panels WHERE code = 'DLCP';

INSERT OR IGNORE INTO tests(code, name, panel_id, result_type, unit, decimals, price, enabled, sort_order)
SELECT 'DLC_MONO',  'Monocytes',    id, 'numeric', '%', 0, 0, 1, 30 FROM panels WHERE code = 'DLCP';

INSERT OR IGNORE INTO tests(code, name, panel_id, result_type, unit, decimals, price, enabled, sort_order)
SELECT 'DLC_EOS',   'Eosinophils',  id, 'numeric', '%', 0, 0, 1, 40 FROM panels WHERE code = 'DLCP';

INSERT OR IGNORE INTO tests(code, name, panel_id, result_type, unit, decimals, price, enabled, sort_order)
SELECT 'DLC_BASO',  'Basophils',    id, 'numeric', '%', 0, 0, 1, 50 FROM panels WHERE code = 'DLCP';

-- 4. Normal ranges
INSERT OR IGNORE INTO test_ranges(test_id, sex, low, high, range_text)
SELECT id, 'ANY', 40, 70, '40 - 70'  FROM tests WHERE code = 'DLC_NEUT';

INSERT OR IGNORE INTO test_ranges(test_id, sex, low, high, range_text)
SELECT id, 'ANY', 20, 45, '20 - 45'  FROM tests WHERE code = 'DLC_LYMPH';

INSERT OR IGNORE INTO test_ranges(test_id, sex, low, high, range_text)
SELECT id, 'ANY', 2,  10, '02 - 10'  FROM tests WHERE code = 'DLC_MONO';

INSERT OR IGNORE INTO test_ranges(test_id, sex, low, high, range_text)
SELECT id, 'ANY', 1,  6,  '01 - 06'  FROM tests WHERE code = 'DLC_EOS';

INSERT OR IGNORE INTO test_ranges(test_id, sex, low, high, range_text)
SELECT id, 'ANY', 0,  1,  '00 - 01'  FROM tests WHERE code = 'DLC_BASO';

INSERT OR IGNORE INTO schema_migrations(version) VALUES('0035');
