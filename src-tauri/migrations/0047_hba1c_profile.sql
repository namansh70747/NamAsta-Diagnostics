-- 0047_hba1c_profile: make HbA1c its own searchable PROFILE (same pattern as CBC/DLC), printing
-- under its own report heading "HBA1C/GLYCOSYLATED HB" with two rows — HbA1c and the
-- auto-calculated eAG (Estimated Average Glucose).
--
-- Previously HbA1c + eAG lived under the DIABETIC PROFILE panel, so they printed beneath
-- "BIOCHEMISTRY / DIABETIC PROFILE" and there was no single "HBA1C" entry to search for. Now:
--   • a dedicated panel whose report heading is "HBA1C/GLYCOSYLATED HB". It is deliberately NOT
--     mapped to a department (see DEPARTMENT in ReportPreviewPage), so the heading prints exactly
--     once on the report — just "HBA1C/GLYCOSYLATED HB", nothing above it;
--   • the existing HbA1c + eAG tests move into it (codes unchanged, so eAG's auto-calc keeps
--     working and old results re-render under the new heading);
--   • a sellable bundle test ("HbA1c (Glycosylated Hb)", is_panel=1) so searching "HBA1C" shows a
--     single profile entry that expands to both member rows on save and bills as one line.
-- eAG already auto-computes from HbA1c (28.7 × HbA1c − 46.7) during result entry and is snapshotted
-- on approval, so no result-entry change is needed.

-- 1. Dedicated panel. sort_order 32 places it just after the biochemistry block (…HORM=31) so the
--    BIOCHEMISTRY department stays contiguous and this prints as its own standalone section.
INSERT OR IGNORE INTO panels(code, name, report_heading, sort_order, page_break_after)
VALUES ('HBA1CP', 'HBA1C/GLYCOSYLATED HB', 'HBA1C/GLYCOSYLATED HB', 32, 0);

-- 2. Move the two member tests out of DIABETIC PROFILE into the new panel.
UPDATE tests
   SET panel_id = (SELECT id FROM panels WHERE code='HBA1CP'), sort_order = 10, updated_at = CURRENT_TIMESTAMP
 WHERE code = 'HBA1C';
UPDATE tests
   SET panel_id = (SELECT id FROM panels WHERE code='HBA1CP'), sort_order = 20, updated_at = CURRENT_TIMESTAMP
 WHERE code = 'EAG';

-- 3. Sellable bundle test → one searchable "HBA1C" profile entry. It bills as a single line and
--    expands to its panel's member tests (HbA1c + eAG) on save (createPatient handles is_panel=1).
--    Price carried by the bundle (₹350, matching the old standalone HbA1c price); members bill at
--    ₹0 when ordered via the bundle. The standalone HbA1c test stays orderable on its own too.
INSERT OR IGNORE INTO tests(code, name, panel_id, result_type, price, enabled, sort_order, is_panel)
SELECT 'HBA1CP', 'HbA1c (Glycosylated Hb)', id, 'text', 350, 1, 0, 1
FROM panels WHERE code='HBA1CP';

INSERT OR IGNORE INTO schema_migrations(version) VALUES('0047');
