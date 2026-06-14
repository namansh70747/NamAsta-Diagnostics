-- ============================================================
-- Migration 0019 : Blood Urea Nitrogen (BUN) auto-calculated from Blood Urea
-- ============================================================
-- BUN = Urea × 0.467 (urea carries 2 nitrogen atoms: 28/60 ≈ 0.4667). computeCalculated()
-- has a dedicated 'BUN' case that reads UREA; the formula text here is documentation.
-- This is the last manual test in the catalogue that is actually a derived value.

UPDATE tests SET result_type = 'calculated', formula = 'UREA * 0.467' WHERE code = 'BUN';

INSERT OR IGNORE INTO schema_migrations(version) VALUES('0019');
