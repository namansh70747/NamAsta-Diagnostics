-- 0036_cbc_units_order: make CBC units and fill-order exactly match the ERBA H360 screen.

-- 1. Clear any per-age-group unit overrides on CBC tests so the test-level unit
--    (which matches the machine) always displays — fixes WBC/PLT showing "/cumm".
UPDATE test_ranges SET unit = NULL
WHERE test_id IN (SELECT id FROM tests WHERE panel_id = (SELECT id FROM panels WHERE code = 'CBC'));

-- 2. Re-assert the exact machine units at the test level.
UPDATE tests SET unit = '10^3/µL' WHERE code = 'WBC';
UPDATE tests SET unit = '%'       WHERE code IN ('LYM_PCT','GRAN_PCT','MID_PCT','HCT','RDW_CV','PDW_CV','PCT_CBC','PLCR');
UPDATE tests SET unit = '10^3/µL' WHERE code IN ('LYM_NUM','GRAN_NUM','MID_NUM','PLT_CBC','PLCC');
UPDATE tests SET unit = '10^6/µL' WHERE code = 'RBC_CNT';
UPDATE tests SET unit = 'g/dL'    WHERE code IN ('HGB','MCHC');
UPDATE tests SET unit = 'fL'      WHERE code IN ('MCV','RDW_SD','MPV','PDW_SD');
UPDATE tests SET unit = 'pg'      WHERE code = 'MCH';

-- 3. Sort order to match the H360 parameter list exactly:
--    WBC, Lym%, Gran%, Mid%, Lym#, Gran#, Mid#, RBC, HGB, HCT, MCV, MCH, MCHC,
--    RDW-CV, RDW-SD, PLT, MPV, PDW-SD, PDW-CV, PCT, P-LCR, P-LCC
UPDATE tests SET sort_order = 1  WHERE code = 'WBC';
UPDATE tests SET sort_order = 2  WHERE code = 'LYM_PCT';
UPDATE tests SET sort_order = 3  WHERE code = 'GRAN_PCT';
UPDATE tests SET sort_order = 4  WHERE code = 'MID_PCT';
UPDATE tests SET sort_order = 5  WHERE code = 'LYM_NUM';
UPDATE tests SET sort_order = 6  WHERE code = 'GRAN_NUM';
UPDATE tests SET sort_order = 7  WHERE code = 'MID_NUM';
UPDATE tests SET sort_order = 8  WHERE code = 'RBC_CNT';
UPDATE tests SET sort_order = 9  WHERE code = 'HGB';
UPDATE tests SET sort_order = 10 WHERE code = 'HCT';
UPDATE tests SET sort_order = 11 WHERE code = 'MCV';
UPDATE tests SET sort_order = 12 WHERE code = 'MCH';
UPDATE tests SET sort_order = 13 WHERE code = 'MCHC';
UPDATE tests SET sort_order = 14 WHERE code = 'RDW_CV';
UPDATE tests SET sort_order = 15 WHERE code = 'RDW_SD';
UPDATE tests SET sort_order = 16 WHERE code = 'PLT_CBC';
UPDATE tests SET sort_order = 17 WHERE code = 'MPV';
UPDATE tests SET sort_order = 18 WHERE code = 'PDW_SD';
UPDATE tests SET sort_order = 19 WHERE code = 'PDW_CV';
UPDATE tests SET sort_order = 20 WHERE code = 'PCT_CBC';
UPDATE tests SET sort_order = 21 WHERE code = 'PLCR';
UPDATE tests SET sort_order = 22 WHERE code = 'PLCC';

INSERT OR IGNORE INTO schema_migrations(version) VALUES('0036');
