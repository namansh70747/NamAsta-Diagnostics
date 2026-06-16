-- 0037: fix DLC normal-range display text — remove leading zeros
-- (02 - 10 → 2 - 10 etc. for cleaner printed report appearance).
UPDATE test_ranges SET range_text = '2 - 10' WHERE test_id = (SELECT id FROM tests WHERE code = 'DLC_MONO');
UPDATE test_ranges SET range_text = '1 - 6'  WHERE test_id = (SELECT id FROM tests WHERE code = 'DLC_EOS');
UPDATE test_ranges SET range_text = '0 - 1'  WHERE test_id = (SELECT id FROM tests WHERE code = 'DLC_BASO');

INSERT OR IGNORE INTO schema_migrations(version) VALUES('0037');
