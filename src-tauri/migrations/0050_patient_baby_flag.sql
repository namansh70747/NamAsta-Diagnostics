-- 0050_patient_baby_flag: support "Baby Boy" / "Baby Girl" as their own gender options on the
-- registration page and report.
--
-- The patients.sex column is CHECK(sex IN ('MALE','FEMALE','OTHER')) and SQLite can't widen a CHECK
-- without a full table rebuild (risky with the orders/bills foreign keys). So instead of new sex
-- values we add a tiny additive flag: a baby patient stores sex='MALE'/'FEMALE' (so reference-range
-- and eGFR lookups keep working unchanged — baby boy resolves M ranges, baby girl F, and the
-- age-in-days already drives neonatal ranges) PLUS baby=1, which the UI/report use to show the
-- "Baby Boy" / "Baby Girl" label.
ALTER TABLE patients ADD COLUMN baby INTEGER NOT NULL DEFAULT 0;

INSERT OR IGNORE INTO schema_migrations(version) VALUES('0050');
