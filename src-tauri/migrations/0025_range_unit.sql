-- ============================================================
-- Migration 0025 : per-age-group unit override on test_ranges
-- ============================================================
-- Adds a nullable `unit` column to test_ranges. When set it overrides the test-level unit
-- for the matched age group — so e.g. WBC can show /cumm for adults and 10^3/µL for
-- paediatric, or bilirubin µmol/L for neonates and mg/dL for adults. NULL = use the
-- test's default unit (all existing rows are unaffected).

ALTER TABLE test_ranges ADD COLUMN unit TEXT;

INSERT OR IGNORE INTO schema_migrations(version) VALUES('0025');
