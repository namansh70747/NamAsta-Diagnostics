-- ============================================================
-- Migration 0023 : age-stratified normal ranges for CBC key tests
-- ============================================================
-- All CBC ranges currently use one 'ANY' row covering all ages — a newborn gets adult HGB
-- ranges, which would produce wrong H/L flags on paediatric reports.
-- This migration adds proper age-group rows. The existing 'ANY' adult-calibrated row stays
-- as the fallback for any age not explicitly covered (findRange picks the narrowest match).

-- ── HGB — Haemoglobin (g/dL) ──
-- Adult M row (replaces ANY so male adults are correctly flagged)
INSERT OR IGNORE INTO test_ranges(test_id, sex, age_min_days, age_max_days, low, high, range_text)
SELECT id, 'M', 6571, 36500, 13.0, 17.5, '13.0 - 17.5' FROM tests WHERE code = 'HGB';
INSERT OR IGNORE INTO test_ranges(test_id, sex, age_min_days, age_max_days, low, high, range_text)
SELECT id, 'F', 6571, 36500, 12.0, 16.0, '12.0 - 16.0' FROM tests WHERE code = 'HGB';
-- Neonate 0-28 d
INSERT OR IGNORE INTO test_ranges(test_id, sex, age_min_days, age_max_days, low, high, range_text)
SELECT id, 'ANY', 0, 28, 13.5, 24.0, '13.5 - 24.0' FROM tests WHERE code = 'HGB';
-- Infant 1-12 mo
INSERT OR IGNORE INTO test_ranges(test_id, sex, age_min_days, age_max_days, low, high, range_text)
SELECT id, 'ANY', 29, 365, 9.5, 14.0, '9.5 - 14.0' FROM tests WHERE code = 'HGB';
-- Child 1-12 yr
INSERT OR IGNORE INTO test_ranges(test_id, sex, age_min_days, age_max_days, low, high, range_text)
SELECT id, 'ANY', 366, 4380, 11.0, 16.0, '11.0 - 16.0' FROM tests WHERE code = 'HGB';

-- ── RBC count (10^6/µL) ──
INSERT OR IGNORE INTO test_ranges(test_id, sex, age_min_days, age_max_days, low, high, range_text)
SELECT id, 'M', 6571, 36500, 4.5, 5.9, '4.5 - 5.9' FROM tests WHERE code = 'RBC_CNT';
INSERT OR IGNORE INTO test_ranges(test_id, sex, age_min_days, age_max_days, low, high, range_text)
SELECT id, 'F', 6571, 36500, 4.0, 5.2, '4.0 - 5.2' FROM tests WHERE code = 'RBC_CNT';
INSERT OR IGNORE INTO test_ranges(test_id, sex, age_min_days, age_max_days, low, high, range_text)
SELECT id, 'ANY', 0, 28, 4.0, 6.6, '4.0 - 6.6' FROM tests WHERE code = 'RBC_CNT';
INSERT OR IGNORE INTO test_ranges(test_id, sex, age_min_days, age_max_days, low, high, range_text)
SELECT id, 'ANY', 29, 365, 3.1, 5.1, '3.1 - 5.1' FROM tests WHERE code = 'RBC_CNT';
INSERT OR IGNORE INTO test_ranges(test_id, sex, age_min_days, age_max_days, low, high, range_text)
SELECT id, 'ANY', 366, 4380, 3.8, 5.2, '3.8 - 5.2' FROM tests WHERE code = 'RBC_CNT';

-- ── HCT — Haematocrit (%) ──
INSERT OR IGNORE INTO test_ranges(test_id, sex, age_min_days, age_max_days, low, high, range_text)
SELECT id, 'M', 6571, 36500, 40.0, 52.0, '40.0 - 52.0' FROM tests WHERE code = 'HCT';
INSERT OR IGNORE INTO test_ranges(test_id, sex, age_min_days, age_max_days, low, high, range_text)
SELECT id, 'F', 6571, 36500, 36.0, 47.0, '36.0 - 47.0' FROM tests WHERE code = 'HCT';
INSERT OR IGNORE INTO test_ranges(test_id, sex, age_min_days, age_max_days, low, high, range_text)
SELECT id, 'ANY', 0, 28, 42.0, 66.0, '42.0 - 66.0' FROM tests WHERE code = 'HCT';
INSERT OR IGNORE INTO test_ranges(test_id, sex, age_min_days, age_max_days, low, high, range_text)
SELECT id, 'ANY', 29, 365, 29.0, 41.0, '29.0 - 41.0' FROM tests WHERE code = 'HCT';
INSERT OR IGNORE INTO test_ranges(test_id, sex, age_min_days, age_max_days, low, high, range_text)
SELECT id, 'ANY', 366, 4380, 34.0, 44.0, '34.0 - 44.0' FROM tests WHERE code = 'HCT';

-- ── WBC (10^3/µL) ──
INSERT OR IGNORE INTO test_ranges(test_id, sex, age_min_days, age_max_days, low, high, range_text)
SELECT id, 'ANY', 0, 28, 9.0, 30.0, '9.0 - 30.0' FROM tests WHERE code = 'WBC';
INSERT OR IGNORE INTO test_ranges(test_id, sex, age_min_days, age_max_days, low, high, range_text)
SELECT id, 'ANY', 29, 365, 6.0, 17.5, '6.0 - 17.5' FROM tests WHERE code = 'WBC';
INSERT OR IGNORE INTO test_ranges(test_id, sex, age_min_days, age_max_days, low, high, range_text)
SELECT id, 'ANY', 366, 4380, 5.0, 15.5, '5.0 - 15.5' FROM tests WHERE code = 'WBC';

-- ── PLT_CBC (10^3/µL) — similar across age groups but slightly different ──
INSERT OR IGNORE INTO test_ranges(test_id, sex, age_min_days, age_max_days, low, high, range_text)
SELECT id, 'ANY', 0, 28, 150, 400, '150 - 400' FROM tests WHERE code = 'PLT_CBC';
INSERT OR IGNORE INTO test_ranges(test_id, sex, age_min_days, age_max_days, low, high, range_text)
SELECT id, 'ANY', 29, 4380, 150, 450, '150 - 450' FROM tests WHERE code = 'PLT_CBC';

-- ── MCV — mean cell volume (fL) ──
-- Adult range is already 80-100 (seed row, 'ANY' all ages). Add paediatric rows.
INSERT OR IGNORE INTO test_ranges(test_id, sex, age_min_days, age_max_days, low, high, range_text)
SELECT id, 'ANY', 0, 28, 98.0, 118.0, '98.0 - 118.0' FROM tests WHERE code = 'MCV';
INSERT OR IGNORE INTO test_ranges(test_id, sex, age_min_days, age_max_days, low, high, range_text)
SELECT id, 'ANY', 29, 365, 70.0, 86.0, '70.0 - 86.0' FROM tests WHERE code = 'MCV';
INSERT OR IGNORE INTO test_ranges(test_id, sex, age_min_days, age_max_days, low, high, range_text)
SELECT id, 'ANY', 366, 4380, 75.0, 91.0, '75.0 - 91.0' FROM tests WHERE code = 'MCV';

-- ── MCH (pg) ──
INSERT OR IGNORE INTO test_ranges(test_id, sex, age_min_days, age_max_days, low, high, range_text)
SELECT id, 'ANY', 0, 28, 31.0, 37.0, '31.0 - 37.0' FROM tests WHERE code = 'MCH';
INSERT OR IGNORE INTO test_ranges(test_id, sex, age_min_days, age_max_days, low, high, range_text)
SELECT id, 'ANY', 29, 365, 23.0, 31.0, '23.0 - 31.0' FROM tests WHERE code = 'MCH';
INSERT OR IGNORE INTO test_ranges(test_id, sex, age_min_days, age_max_days, low, high, range_text)
SELECT id, 'ANY', 366, 4380, 24.0, 31.0, '24.0 - 31.0' FROM tests WHERE code = 'MCH';

INSERT OR IGNORE INTO schema_migrations(version) VALUES('0023');
