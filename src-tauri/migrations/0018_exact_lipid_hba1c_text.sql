-- ============================================================
-- Migration 0018 : exact lipid + HbA1c test names, ranges and remarks (match the lab's pad)
-- ============================================================

-- ── Lipid profile: exact test names from the printed report ──
UPDATE tests SET name = 'S.Cholesterol Total'      WHERE code = 'CHOL';
UPDATE tests SET name = 'S.Triglycerides'          WHERE code = 'TG';
UPDATE tests SET name = 'HDL Cholesterol (Direct)' WHERE code = 'BHDL';
UPDATE tests SET name = 'VLDL CHOLESTEROL', unit = '' WHERE code = 'BVLDL';
UPDATE tests SET name = 'Chol / HDL ratio'         WHERE code = 'BRAT';
UPDATE tests SET name = 'LDL / HDL RATIO'          WHERE code = 'BLHR';
UPDATE tests SET name = 'Non HDL Cholesterol'      WHERE code = 'NHDL';
UPDATE tests SET name = 'HbA1c'                    WHERE code = 'HBA1C';

-- ── Lipid normal ranges: exact multi-line text (the report renderer splits on " / ") ──
UPDATE test_ranges SET range_text = 'Normal:<200 / Borderline: 200-239 / High: >240'
  WHERE test_id = (SELECT id FROM tests WHERE code = 'CHOL');
UPDATE test_ranges SET range_text = '( 30 -150 ) / (Border line:- 200- 199) / (High :- 200-499) / Very High:- >499.00'
  WHERE test_id = (SELECT id FROM tests WHERE code = 'TG');
UPDATE test_ranges SET range_text = 'Low: <40 / Optimal: 40-60 / High: >60'
  WHERE test_id = (SELECT id FROM tests WHERE code = 'BHDL');
UPDATE test_ranges SET range_text = '12.00-30.00'
  WHERE test_id = (SELECT id FROM tests WHERE code = 'BVLDL');
UPDATE test_ranges SET range_text = 'Optimal: < 130 / Borderline: 130-160 / High: >160'
  WHERE test_id = (SELECT id FROM tests WHERE code = 'BLDL');
UPDATE test_ranges SET range_text = '0 - 4.8'
  WHERE test_id = (SELECT id FROM tests WHERE code = 'BRAT');
UPDATE test_ranges SET range_text = '0.00-3.5'
  WHERE test_id = (SELECT id FROM tests WHERE code = 'BLHR');
UPDATE test_ranges SET range_text = '400 - 700'
  WHERE test_id = (SELECT id FROM tests WHERE code = 'TL');
UPDATE test_ranges SET range_text = '< 130'
  WHERE test_id = (SELECT id FROM tests WHERE code = 'NHDL');

-- ── Lipid panel footnote (prints as plain text under the panel, via band_text on the CHOL row) ──
UPDATE test_ranges SET band_text = 'Note: 10 -12 hours fasting is mandatory for lipid parameters. If not, values might fluctuate.
Remark: Measurements in the same patient can show physiological and analytical variations. 3 serial samples 1 week apart are recommended for Total Cholesterol, Triglyceride, HDL and LDL Cholesterol.'
  WHERE test_id = (SELECT id FROM tests WHERE code = 'CHOL');

-- ── HbA1c: multi-line bands in the Normal Ranges column + the REMARKS box ──
UPDATE test_ranges SET range_text = '4.0-5.6 Non- diabetic / 5.7 -6.3 Prediabetic / 6.3 -7.0 Good control / 7.0- 8.0 Fair control / >8.0 Poor control'
  WHERE test_id = (SELECT id FROM tests WHERE code = 'HBA1C');
UPDATE tests SET interpretation_note =
'REMARKS: In vitro quantitative determination of HbA1c in whole blood is utilized in long term monitoring of glycemia. The HbA1c level correlates with the mean glucose concentration prevailing in the course of the patient''s recent history (approx - 6-8 weeks) and therefore provides much more reliable information for glycemia monitoring than do determinations of blood glucose or urinary glucose. It is recommended that the determination of HbA1c be performed at intervals of 4-6 weeks during Diabetes Mellitus therapy. Results of HbA1c should be assessed in conjunction with the patient''s medical history, clinical examinations and other findings.'
  WHERE code = 'HBA1C';

INSERT OR IGNORE INTO schema_migrations(version) VALUES('0018');
