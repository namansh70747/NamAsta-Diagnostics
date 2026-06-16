-- 0034_elec_revert: move Sodium and Potassium back to their ELECTROLYTES panel
-- Migration 0032 put them in KFT which caused standalone Sodium/Potassium orders
-- to show the "RENAL FUNCTION TEST (RFT/KFT)" heading incorrectly.
UPDATE tests
  SET panel_id = (SELECT id FROM panels WHERE code = 'ELEC'), sort_order = 10
  WHERE code = 'NA';

UPDATE tests
  SET panel_id = (SELECT id FROM panels WHERE code = 'ELEC'), sort_order = 20
  WHERE code = 'K';

INSERT OR IGNORE INTO schema_migrations(version) VALUES('0034');
