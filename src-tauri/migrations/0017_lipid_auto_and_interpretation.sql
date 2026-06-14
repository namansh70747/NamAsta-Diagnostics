-- ============================================================
-- Migration 0017 : LDL + Total Lipids auto-calculated; post-prandial interpretation
-- ============================================================
-- Applies to the shared test catalogue (every lab), so the lipid profile and glucose reports
-- come out like the lab's printed pad.

-- LDL Cholesterol → auto (Friedewald): Total Cholesterol − HDL − VLDL(=TG/5).
-- (computeCalculated() has a dedicated 'BLDL' Friedewald case; the formula is documentation.)
UPDATE tests SET result_type = 'calculated', formula = 'CHOL - BHDL - TG / 5' WHERE code = 'BLDL';

-- Total Lipids → auto. This lab computes Total Lipids = 2 × Total Cholesterol + Triglycerides
-- (verified against the lab's report: 2×214.9 + 107.7 = 537.5).
UPDATE tests SET result_type = 'calculated', formula = '2 * CHOL + TG' WHERE code = 'TL';

-- Post-prandial glucose interpretation box (Fasting already had one; this matches the pad).
UPDATE tests SET interpretation_note =
'Interpretation (in accordance with the American diabetes association guidelines):
A postprandial blood glucose level below 140 mg/dL is considered normal.
A postprandial blood glucose level between 140-199 mg/dL is considered as glucose intolerant or pre diabetic.
A postprandial blood glucose level of above 200 mg/dL is highly suggestive of a diabetic state. A repeat fasting test is strongly recommended for all such patients. A fasting plasma glucose level in excess of 126 mg/dL on two different occasions is confirmatory of a diabetic state.'
WHERE code = 'PPBS';

-- Post-prandial printed normal range to match the pad (70.0 - 150.0).
UPDATE test_ranges SET high = 150, range_text = '70.0 - 150.0'
  WHERE test_id = (SELECT id FROM tests WHERE code = 'PPBS');

-- The lipid profile on the pad shows only multi-line ranges (no interpretation box), so clear
-- the lipid summary note — the per-test ranges carry the interpretation.
UPDATE tests SET interpretation_note = NULL WHERE code = 'CHOL';

INSERT OR IGNORE INTO schema_migrations(version) VALUES('0017');
