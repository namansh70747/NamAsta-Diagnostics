-- ============================================================
-- Migration 0024 : complete normal ranges for every test that needed them
-- ============================================================

-- ── 1. Creatinine — M/F split (male creatinine is meaningfully higher than female) ──
-- The existing ANY row stays as fallback. Add specific M/F rows that will take priority.
INSERT OR IGNORE INTO test_ranges(test_id, sex, low, high, range_text)
SELECT id, 'M', 0.70, 1.30, '0.70 - 1.30' FROM tests WHERE code = 'CRT';
INSERT OR IGNORE INTO test_ranges(test_id, sex, low, high, range_text)
SELECT id, 'F', 0.50, 1.10, '0.50 - 1.10' FROM tests WHERE code = 'CRT';

-- ── 2. ALP (Alkaline Phosphatase) — age groups (children have 3× higher ALP from bone growth) ──
-- Narrower rows take priority over the existing wide ANY row.
INSERT OR IGNORE INTO test_ranges(test_id, sex, age_min_days, age_max_days, low, high, range_text)
SELECT id, 'ANY', 0, 28, 75, 375, '75 - 375' FROM tests WHERE code = 'ALP';
INSERT OR IGNORE INTO test_ranges(test_id, sex, age_min_days, age_max_days, low, high, range_text)
SELECT id, 'ANY', 29, 4380, 100, 420, '100 - 420' FROM tests WHERE code = 'ALP';   -- infant+child 1mo-12yr
INSERT OR IGNORE INTO test_ranges(test_id, sex, age_min_days, age_max_days, low, high, range_text)
SELECT id, 'ANY', 4381, 6570, 55, 255, '55 - 255' FROM tests WHERE code = 'ALP';   -- adolescent 12-18yr

-- ── 3. Phosphorus — age groups (children have higher phosphorus from bone mineralisation) ──
INSERT OR IGNORE INTO test_ranges(test_id, sex, age_min_days, age_max_days, low, high, range_text)
SELECT id, 'ANY', 0, 28, 4.5, 9.0, '4.5 - 9.0' FROM tests WHERE code = 'PHO';     -- neonate
INSERT OR IGNORE INTO test_ranges(test_id, sex, age_min_days, age_max_days, low, high, range_text)
SELECT id, 'ANY', 29, 4380, 4.0, 6.0, '4.0 - 6.0' FROM tests WHERE code = 'PHO';  -- infant+child

-- ── 4. Prolactin — M/F split ──
INSERT OR IGNORE INTO test_ranges(test_id, sex, low, high, range_text)
SELECT id, 'M', 2.5, 17.0, '2.5 - 17.0' FROM tests WHERE code = 'PRL';
INSERT OR IGNORE INTO test_ranges(test_id, sex, low, high, range_text)
SELECT id, 'F', 2.0, 29.0, '2.0 - 29.0' FROM tests WHERE code = 'PRL';

-- ── 5. Urine qualitative tests — normal range text (currently blank on the report) ──
INSERT OR IGNORE INTO test_ranges(test_id, sex, range_text)
SELECT id, 'ANY', 'Yellow / Pale Yellow' FROM tests WHERE code = 'U_COLOUR';

INSERT OR IGNORE INTO test_ranges(test_id, sex, range_text)
SELECT id, 'ANY', 'Clear' FROM tests WHERE code = 'U_APP';

INSERT OR IGNORE INTO test_ranges(test_id, sex, range_text)
SELECT id, 'ANY', 'Nil' FROM tests WHERE code = 'U_PROTEIN';

INSERT OR IGNORE INTO test_ranges(test_id, sex, range_text)
SELECT id, 'ANY', 'Nil' FROM tests WHERE code = 'U_GLUCOSE';

INSERT OR IGNORE INTO test_ranges(test_id, sex, range_text)
SELECT id, 'ANY', 'Nil' FROM tests WHERE code = 'U_KETONE';

INSERT OR IGNORE INTO test_ranges(test_id, sex, range_text)
SELECT id, 'ANY', 'Nil' FROM tests WHERE code = 'U_BLOOD';

INSERT OR IGNORE INTO test_ranges(test_id, sex, range_text)
SELECT id, 'ANY', 'Normal' FROM tests WHERE code = 'U_URO';

INSERT OR IGNORE INTO test_ranges(test_id, sex, range_text)
SELECT id, 'ANY', 'Negative' FROM tests WHERE code = 'U_NITRITE';

INSERT OR IGNORE INTO test_ranges(test_id, sex, range_text)
SELECT id, 'ANY', 'Nil' FROM tests WHERE code = 'U_EPIT';

INSERT OR IGNORE INTO test_ranges(test_id, sex, range_text)
SELECT id, 'ANY', 'Nil' FROM tests WHERE code = 'U_CAST';

INSERT OR IGNORE INTO test_ranges(test_id, sex, range_text)
SELECT id, 'ANY', 'Nil' FROM tests WHERE code = 'U_CRYSTAL';

INSERT OR IGNORE INTO test_ranges(test_id, sex, range_text)
SELECT id, 'ANY', 'Nil' FROM tests WHERE code = 'U_BACTERIA';

-- Urine RBC: 0-2/hpf (already has row for pus cells)
INSERT OR IGNORE INTO test_ranges(test_id, sex, high, range_text)
SELECT id, 'ANY', 2, '0 - 2 /hpf' FROM tests WHERE code = 'U_RBC';

-- ── 6. Add range_text to CPKM (CPK-MB) which has no range_text ──
INSERT OR IGNORE INTO test_ranges(test_id, sex, high, range_text)
SELECT id, 'ANY', 25, '< 25' FROM tests WHERE code = 'CPKM';

-- ── 7. Missing ranges entirely ──
-- DDIMER (D-Dimer)
INSERT OR IGNORE INTO test_ranges(test_id, sex, high, range_text)
SELECT id, 'ANY', 0.5, '< 0.5 µg/mL FEU' FROM tests WHERE code = 'DDIMER';

-- TROP (Troponin — high-sensitivity threshold; any positive is significant)
INSERT OR IGNORE INTO test_ranges(test_id, sex, high, range_text)
SELECT id, 'ANY', 0.04, '< 0.04 ng/mL' FROM tests WHERE code = 'TROP';

-- UPT (Urine Pregnancy Test — qualitative)
INSERT OR IGNORE INTO test_ranges(test_id, sex, range_text)
SELECT id, 'ANY', 'Negative' FROM tests WHERE code = 'UPT';

-- ── 8. INSPP (Post-Prandial Insulin) — verify/add range ──
INSERT OR IGNORE INTO test_ranges(test_id, sex, high, range_text)
SELECT id, 'ANY', 80, '< 80 µIU/mL' FROM tests WHERE code = 'INSPP';

INSERT OR IGNORE INTO schema_migrations(version) VALUES('0024');
