-- 0041: per-order normal-range override. Like the unit override (0040), this lets
-- staff change the printed normal range for ONE patient on the result-entry page
-- without altering the test's stored range — so it never affects other patients.
ALTER TABLE orders ADD COLUMN range_override TEXT;

INSERT OR IGNORE INTO schema_migrations(version) VALUES('0041');
