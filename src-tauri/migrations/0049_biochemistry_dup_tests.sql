-- ============================================================
-- SCL Lab App  –  Migration 0047 : Biochemistry duplicate tests
-- ============================================================
-- The lab wants two ways to order the common biochemistry analytes:
--   • the NATIVE code (e.g. FBS) stays in its profile (Diabetic, Renal,
--     Lipid, Electrolytes, Liver) and the report heads with that profile
--     name — DIABETIC PROFILE, etc. (no "BIOCHEMISTRY" umbrella; see the
--     DEPARTMENT map change in ReportPreviewPage.tsx).
--   • a "…1"-suffixed code (e.g. FBS1) lives in the BIO panel so the report
--     heads with a single BIOCHEMISTRY section listing them together.
--
-- This migration clones 25 native tests (the user's 22 items; "Chloride
-- Calcium" = CL+CAL, "Bilirubin (auto)" = BBT+BBD+BBI) into the BIO panel,
-- appending '1' to each code and copying everything else (name, unit,
-- decimals, price, interpretation notes, ranges) verbatim. All idempotent.
-- ============================================================

-- ── 2a. Clone the test rows into the BIO panel ──────────────
INSERT OR IGNORE INTO tests
  (code, name, panel_id, result_type, unit, decimals, price, enabled, sort_order,
   choices, default_value, formula, interpretation_note, is_panel, needs_review)
SELECT t.code || '1', t.name, (SELECT id FROM panels WHERE code='BIO'),
       t.result_type, t.unit, t.decimals, t.price, 1, 0,
       t.choices, t.default_value, t.formula, t.interpretation_note, 0, t.needs_review
FROM tests t
WHERE t.code IN ('FBS','PPBS','RBS','UREA','CRT','UA','NA','K','CL','CAL','PHO',
                 'CHOL','TG','BHDL','BBT','BBD','BBI','OT','PT_ALT','ALP','BGGT',
                 'TPN','ALB','GLO','BAG');

-- ── 2b. Order the duplicates as the user listed them ────────
-- Dedicated 1000+ band so they sit together AFTER every existing misc-BIO test
-- (those run 10–170 plus Lipase at 360), with no sort_order collisions.
UPDATE tests SET sort_order = CASE code
    WHEN 'FBS1'    THEN 1000
    WHEN 'PPBS1'   THEN 1010
    WHEN 'RBS1'    THEN 1020
    WHEN 'UREA1'   THEN 1030
    WHEN 'CRT1'    THEN 1040
    WHEN 'UA1'     THEN 1050
    WHEN 'NA1'     THEN 1060
    WHEN 'K1'      THEN 1070
    WHEN 'CL1'     THEN 1080
    WHEN 'CAL1'    THEN 1090
    WHEN 'PHO1'    THEN 1100
    WHEN 'CHOL1'   THEN 1110
    WHEN 'TG1'     THEN 1120
    WHEN 'BHDL1'   THEN 1130
    WHEN 'BBT1'    THEN 1140
    WHEN 'BBD1'    THEN 1150
    WHEN 'BBI1'    THEN 1160
    WHEN 'OT1'     THEN 1170
    WHEN 'PT_ALT1' THEN 1180
    WHEN 'ALP1'    THEN 1190
    WHEN 'BGGT1'   THEN 1200
    WHEN 'TPN1'    THEN 1210
    WHEN 'ALB1'    THEN 1220
    WHEN 'GLO1'    THEN 1230
    WHEN 'BAG1'    THEN 1240
END
WHERE code IN ('FBS1','PPBS1','RBS1','UREA1','CRT1','UA1','NA1','K1','CL1','CAL1',
               'PHO1','CHOL1','TG1','BHDL1','BBT1','BBD1','BBI1','OT1','PT_ALT1',
               'ALP1','BGGT1','TPN1','ALB1','GLO1','BAG1');

-- ── 2c. Repoint the calculated duplicates at the "…1" inputs ─
-- (the clone copied the native formulas verbatim; the calc engine resolves
--  formula tokens by code within a single order, so they must use the twins)
UPDATE tests SET formula = 'BBT1 - BBD1' WHERE code = 'BBI1';
UPDATE tests SET formula = 'TPN1 - ALB1' WHERE code = 'GLO1';
UPDATE tests SET formula = 'ALB1 / GLO1' WHERE code = 'BAG1';

-- ── 2d. Clone the reference ranges onto each "…1" twin ──────
INSERT OR IGNORE INTO test_ranges
  (test_id, sex, age_min_days, age_max_days, low, high, range_text, band_text)
SELECT dup.id, r.sex, r.age_min_days, r.age_max_days, r.low, r.high, r.range_text, r.band_text
FROM test_ranges r
JOIN tests orig ON r.test_id = orig.id
JOIN tests dup  ON dup.code = orig.code || '1'
WHERE orig.code IN ('FBS','PPBS','RBS','UREA','CRT','UA','NA','K','CL','CAL','PHO',
                    'CHOL','TG','BHDL','BBT','BBD','BBI','OT','PT_ALT','ALP','BGGT',
                    'TPN','ALB','GLO','BAG');

INSERT OR IGNORE INTO schema_migrations(version) VALUES('0049');
