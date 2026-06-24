-- 0051_salmonella_profile: merge the separate Salmonella Typhi IgG / IgM tests (STYPHIGG, STYPHIGM)
-- into a single orderable "SAL" profile that expands into two result rows — same pattern as the
-- CBC / DLC / HBA1C bundles.
--
-- A bundle test (is_panel=1) expands to ALL enabled is_panel=0 members of its panel, so the two
-- tests need their own panel (otherwise SAL would pull in the whole SEROLOGY panel). We therefore:
--   1. create a dedicated panel SALP,
--   2. move STYPHIGG + STYPHIGM into it (codes/choices/interpretation unchanged),
--   3. add the SAL bundle test in that panel.
-- The panel is mapped to the SEROLOGY department in the report (see DEPARTMENT in ReportPreviewPage),
-- so it still prints under SEROLOGY with its own sub-heading.

-- 1. Dedicated panel, just after SEROLOGY (sort_order 40).
INSERT OR IGNORE INTO panels(code, name, report_heading, sort_order, page_break_after)
VALUES ('SALP', 'SALMONELLA TYPHI ANTIBODIES (TYPHIDOT)', 'SALMONELLA TYPHI ANTIBODIES (TYPHIDOT)', 41, 0);

-- 2. Move the two member tests into it (kept enabled, is_panel=0, choice type — bundle expansion
--    needs them enabled; they also stay individually searchable).
UPDATE tests
   SET panel_id = (SELECT id FROM panels WHERE code='SALP'), sort_order = 10, updated_at = CURRENT_TIMESTAMP
 WHERE code = 'STYPHIGG';
UPDATE tests
   SET panel_id = (SELECT id FROM panels WHERE code='SALP'), sort_order = 20, updated_at = CURRENT_TIMESTAMP
 WHERE code = 'STYPHIGM';

-- 3. Sellable bundle test → one searchable "SAL" profile that expands to IgG + IgM on order.
INSERT OR IGNORE INTO tests(code, name, panel_id, result_type, unit, decimals, price, enabled, sort_order, is_panel)
SELECT 'SAL', 'Salmonella Typhi (IgG + IgM)', id, 'text', '', 0, 300, 1, 0, 1
FROM panels WHERE code='SALP';

INSERT OR IGNORE INTO schema_migrations(version) VALUES('0051');
