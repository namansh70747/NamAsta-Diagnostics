-- 0040: per-order unit override. Lets staff change the displayed unit for ONE
-- patient's test on the result-entry page (e.g. a special case) without altering
-- the test's default unit in Test Master — so it never affects other patients.
ALTER TABLE orders ADD COLUMN unit_override TEXT;

INSERT OR IGNORE INTO schema_migrations(version) VALUES('0040');
