-- ============================================================
-- Migration 0020 : complete the diabetic-profile interpretations (RBS + GTT)
-- ============================================================
-- FBS, PPBS and HbA1c already carry interpretation boxes. RBS and the Glucose Tolerance Test
-- did not (the GTT report printed with no range and no interpretation). This adds them so the
-- whole diabetic profile is consistent with the lab's printed style.

-- Random Blood Sugar — interpretation box.
UPDATE tests SET interpretation_note =
'Interpretation (in accordance with the American diabetes association guidelines):
A random plasma glucose level below 140 mg/dL is considered normal.
A random plasma glucose level between 140-199 mg/dL is considered as glucose intolerant or pre diabetic.
A random plasma glucose level of 200 mg/dL or above, with symptoms, is suggestive of a diabetic state and should be confirmed with a fasting plasma glucose / HbA1c.'
WHERE code = 'RBS';

-- Glucose Tolerance Test — add a normal range (2-hour value) if it has none, plus interpretation.
INSERT INTO test_ranges(test_id, sex, high, range_text)
SELECT t.id, 'ANY', 140, '< 140 (2 hr)'
FROM tests t
WHERE t.code = 'GTT'
  AND NOT EXISTS (SELECT 1 FROM test_ranges r WHERE r.test_id = t.id);

UPDATE tests SET interpretation_note =
'Interpretation (2-hour 75 g oral glucose tolerance test):
A 2-hour plasma glucose level below 140 mg/dL is considered normal.
A 2-hour plasma glucose level between 140-199 mg/dL indicates impaired glucose tolerance (pre diabetic).
A 2-hour plasma glucose level of 200 mg/dL or above is suggestive of a diabetic state. Correlate clinically and confirm as advised.'
WHERE code = 'GTT';

INSERT OR IGNORE INTO schema_migrations(version) VALUES('0020');
