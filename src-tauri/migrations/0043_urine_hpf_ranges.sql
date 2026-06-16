-- 0043: drop the redundant "/hpf" from Pus Cells & RBC normal-range text (the Units column
-- already shows /hpf), so the range no longer wraps onto a second line.
UPDATE test_ranges SET range_text = '0 - 5' WHERE test_id = (SELECT id FROM tests WHERE code = 'U_PUS');
UPDATE test_ranges SET range_text = '0 - 2' WHERE test_id = (SELECT id FROM tests WHERE code = 'U_RBC');

INSERT OR IGNORE INTO schema_migrations(version) VALUES('0043');
