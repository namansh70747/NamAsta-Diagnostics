-- 0042: simplify the Urine Colour normal range — show just "Yellow" (drop "Pale Yellow").
UPDATE test_ranges SET range_text = 'Yellow'
WHERE test_id = (SELECT id FROM tests WHERE code = 'U_COLOUR');

INSERT OR IGNORE INTO schema_migrations(version) VALUES('0042');
