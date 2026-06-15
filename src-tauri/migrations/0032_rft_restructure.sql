-- 0032_rft_restructure: restructure the Renal Function Test (KFT) panel

-- 1. Disable Ionized Calcium (superseded by standard Calcium)
UPDATE tests SET enabled = 0 WHERE code = 'BCALI';

-- 2. Move eGFR above Blood Urea Nitrogen (sort 22, between BUN:20 and CRT:30)
UPDATE tests SET sort_order = 22 WHERE code = 'GFR';

-- 3. Remove H/L flags from eGFR — GFR_CAT will explain the stage instead
UPDATE test_ranges SET low = NULL, high = NULL
WHERE test_id = (SELECT id FROM tests WHERE code = 'GFR');

-- 4. Add GFR Category (auto-calculated from eGFR, sort 24)
INSERT OR IGNORE INTO tests(code, name, panel_id, result_type, unit, decimals, price, enabled, sort_order, formula)
SELECT 'GFR_CAT', 'GFR Category', id, 'calculated', '', 0, 0, 1, 24, 'GFR_CAT'
FROM panels WHERE code = 'KFT';

-- 5. Add BUN/Creatinine Ratio (auto-calculated, sort 32)
INSERT OR IGNORE INTO tests(code, name, panel_id, result_type, unit, decimals, price, enabled, sort_order, formula)
SELECT 'BUN_CRT', 'BUN/Creatinine Ratio', id, 'calculated', '', 1, 0, 1, 32, 'BUN / CRT'
FROM panels WHERE code = 'KFT';

-- Normal range 10-20 for BUN/Creatinine Ratio
INSERT OR IGNORE INTO test_ranges(test_id, sex, low, high, range_text)
SELECT id, 'ANY', 10, 20, '10 - 20' FROM tests WHERE code = 'BUN_CRT';

-- 6. Move Sodium and Potassium from ELEC panel into KFT panel
UPDATE tests SET panel_id = (SELECT id FROM panels WHERE code = 'KFT'), sort_order = 42 WHERE code = 'NA';
UPDATE tests SET panel_id = (SELECT id FROM panels WHERE code = 'KFT'), sort_order = 44 WHERE code = 'K';

INSERT OR IGNORE INTO schema_migrations(version) VALUES('0032');
