-- ============================================================
-- Migration 0013 : grandfather an already-in-use install past first-run setup
-- ============================================================
-- The licensed build shows a first-run onboarding wizard (name the lab + create the admin
-- login) whenever the `setup_done` flag is absent. A brand-new customer DB has the seed data
-- but NO patients, so it should onboard. An install that's already in real use (e.g. the
-- original Sharma lab) has its own login + patient history; forcing it back through onboarding
-- would reset its identity and recreate its admin. So: if this DB already has patients, it's an
-- in-use install — mark it set up so updating never disturbs it. Fresh installs (0 patients)
-- still onboard normally.
INSERT OR IGNORE INTO settings(key, value)
SELECT 'setup_done', '1'
WHERE (SELECT COUNT(*) FROM patients) > 0;

INSERT OR IGNORE INTO schema_migrations(version) VALUES('0013');
