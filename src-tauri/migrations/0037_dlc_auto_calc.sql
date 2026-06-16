-- 0037_dlc_auto_calc: auto-fill DLC from CBC differential when both are ordered.
-- H360 3-part diff maps directly: LYM_PCT→Lymphocytes, GRAN_PCT→Neutrophils,
-- MID_PCT→Monocytes. The formula evaluator scans all orders in the same visit,
-- so these will auto-populate as soon as CBC values are entered or imported.
-- Eosinophils and Basophils have no 3-part diff equivalent — remain manual entry.
UPDATE tests SET auto_calc_formula = 'LYM_PCT'  WHERE code = 'DLC_LYMPH';
UPDATE tests SET auto_calc_formula = 'GRAN_PCT' WHERE code = 'DLC_NEUT';
UPDATE tests SET auto_calc_formula = 'MID_PCT'  WHERE code = 'DLC_MONO';

INSERT OR IGNORE INTO schema_migrations(version) VALUES('0037');
