-- 0039: add DLCP bundle test so "DLC" appears as a single searchable panel entry.
-- Without this, searching "DLC" shows 5 individual codes; with it, DLCP bundle
-- sorts first and expands to all 5 member tests on save (same pattern as CBC).
INSERT OR IGNORE INTO tests(code, name, panel_id, result_type, price, enabled, sort_order, is_panel)
SELECT 'DLCP', 'Differential Leukocyte Count (DLC)',
       id, 'text', 0, 1, 0, 1
FROM panels WHERE code = 'DLCP';

INSERT OR IGNORE INTO schema_migrations(version) VALUES('0039');
