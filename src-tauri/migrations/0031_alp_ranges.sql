-- ============================================================
-- Migration 0031 : ALP — lab-validated age-group reference ranges
-- ============================================================
-- Previous entries (seed + 0024) used generic textbook values.
-- Sharma Clinical Lab's validated ranges:
--   0–15 years : 210–810 U/L  (growing bone produces high ALP)
--   15 years+  : 100–306 U/L  (adult range)

-- Remove all existing ALP ranges before inserting the corrected ones.
DELETE FROM test_ranges WHERE test_id = (SELECT id FROM tests WHERE code = 'ALP');

-- Children (0–15 years = 0–5475 days).
INSERT INTO test_ranges(test_id, sex, age_min_days, age_max_days, low, high, range_text)
SELECT id, 'ANY', 0, 5475, 210, 810, '210 - 810' FROM tests WHERE code = 'ALP';

-- Adults (15 years +). Default age_max_days = 54750 covers all practical ages.
INSERT INTO test_ranges(test_id, sex, age_min_days, age_max_days, low, high, range_text)
SELECT id, 'ANY', 5476, 54750, 100, 306, '100 - 306' FROM tests WHERE code = 'ALP';

INSERT OR IGNORE INTO schema_migrations(version) VALUES('0031');
