-- 0048_haematology_spelling_fix: correct every misspelling of "Haematology" (the British spelling
-- the report's HAEMATOLOGY department uses) wherever it appears in panel and test labels — the
-- American "Hematology" plus the "Hemotology" / "Haemotology" typos, in any letter case.
--
-- 0044 only fixed the exact-uppercase American "HEMATOLOGY" on panels. This also catches the typo
-- with an "o", mixed/lower case standalone labels, and test names — while never double-prefixing an
-- already-correct "HAEMATOLOGY".

-- (a) Whole-label matches — the common case, where a panel/department/test is named exactly the
--     word (handles any case, e.g. "Hemotology", "hematology", "HEMOTOLOGY").
UPDATE panels SET report_heading = 'HAEMATOLOGY'
 WHERE UPPER(TRIM(report_heading)) IN ('HEMATOLOGY','HEMOTOLOGY','HAEMOTOLOGY');
UPDATE panels SET name = 'HAEMATOLOGY'
 WHERE UPPER(TRIM(name)) IN ('HEMATOLOGY','HEMOTOLOGY','HAEMOTOLOGY');
UPDATE tests SET name = 'HAEMATOLOGY'
 WHERE UPPER(TRIM(name)) IN ('HEMATOLOGY','HEMOTOLOGY','HAEMOTOLOGY');

-- (b) Embedded uppercase matches — the word inside a longer label (e.g. "CLINICAL HEMOTOLOGY").
--     The "Hemotology" / "Haemotology" typo variants first, then the American form, each guarded
--     so a correct "HAEMATOLOGY" is never touched. (LIKE is case-insensitive; REPLACE is not, so
--     this targets the all-caps labels the app actually stores.)
UPDATE panels SET report_heading = REPLACE(report_heading,'HAEMOTOLOGY','HAEMATOLOGY') WHERE report_heading LIKE '%HAEMOTOLOGY%';
UPDATE panels SET name           = REPLACE(name,'HAEMOTOLOGY','HAEMATOLOGY')           WHERE name           LIKE '%HAEMOTOLOGY%';
UPDATE tests  SET name           = REPLACE(name,'HAEMOTOLOGY','HAEMATOLOGY')           WHERE name           LIKE '%HAEMOTOLOGY%';

UPDATE panels SET report_heading = REPLACE(report_heading,'HEMOTOLOGY','HAEMATOLOGY') WHERE report_heading LIKE '%HEMOTOLOGY%';
UPDATE panels SET name           = REPLACE(name,'HEMOTOLOGY','HAEMATOLOGY')           WHERE name           LIKE '%HEMOTOLOGY%';
UPDATE tests  SET name           = REPLACE(name,'HEMOTOLOGY','HAEMATOLOGY')           WHERE name           LIKE '%HEMOTOLOGY%';

UPDATE panels SET report_heading = REPLACE(report_heading,'HEMATOLOGY','HAEMATOLOGY') WHERE report_heading LIKE '%HEMATOLOGY%' AND report_heading NOT LIKE '%HAEMATOLOGY%';
UPDATE panels SET name           = REPLACE(name,'HEMATOLOGY','HAEMATOLOGY')           WHERE name           LIKE '%HEMATOLOGY%' AND name NOT LIKE '%HAEMATOLOGY%';
UPDATE tests  SET name           = REPLACE(name,'HEMATOLOGY','HAEMATOLOGY')           WHERE name           LIKE '%HEMATOLOGY%' AND name NOT LIKE '%HAEMATOLOGY%';

INSERT OR IGNORE INTO schema_migrations(version) VALUES('0048');
