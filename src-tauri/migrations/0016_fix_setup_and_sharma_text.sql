-- ============================================================
-- Migration 0016 : repair 0014 for fresh installs + Sharma's exact letterhead text
-- ============================================================
-- Migration 0014 unconditionally renamed the admin to 'vicky' and set setup_done=1. That is
-- correct ONLY for the in-use Sharma lab (which has patient history). On a brand-new customer
-- install (no patients yet) it wrongly skipped onboarding and pre-named the admin — the new lab
-- would never see the setup form. Distinguish the two by patient count.

-- (1) FRESH install (no patients) → undo 0014 so a new customer onboards normally.
DELETE FROM settings WHERE key = 'setup_done'
  AND (SELECT COUNT(*) FROM patients) = 0;
UPDATE users SET username = 'admin', display_name = 'Administrator', updated_at = CURRENT_TIMESTAMP
  WHERE username = 'vicky' AND (SELECT COUNT(*) FROM patients) = 0;

-- (2) IN-USE Sharma install (has patients) → the EXACT letterhead text from the lab's printed pad.
UPDATE settings SET value = 'Summer - 7:30 am to 9:00 pm | Winter - 8:15 am to 7:30 pm'
  WHERE key = 'timings' AND (SELECT COUNT(*) FROM patients) > 0;
UPDATE settings SET value = 'ERBA H360 Blood Cell Counter, ERBA CHEM-5 PLUS V2, EBRA Semi Auto Analyser CHEM-7 & STAR 21 Semi Auto Analyser. Uri-plus 200 Urine Chemistry Analyser, Qua-lab Hba1c Analyser.'
  WHERE key = 'equipment_line' AND (SELECT COUNT(*) FROM patients) > 0;
UPDATE settings SET value = 'T3, T4, TSH (THYROID), LH, FSH, PROLACTIN, TESTOSTERONE, ESTRADIOL, LFT, LIPID PROFILE, KIDNEY FUNCTION TEST''S CULTURES, MALARIA ANTIGEN, TYPHOID ANTIBODIES TESTS AVAILABLES'
  WHERE key = 'footer_tests_line' AND (SELECT COUNT(*) FROM patients) > 0;

INSERT OR IGNORE INTO schema_migrations(version) VALUES('0016');
