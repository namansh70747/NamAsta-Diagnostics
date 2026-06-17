-- The 'HEM' panel (and any others) were seeded with the American spelling "HEMATOLOGY" in their
-- report_heading/name, while the report's department is the British "HAEMATOLOGY". The report shows
-- BOTH (the centered department heading + the panel sub-heading), so "HAEMATOLOGY" then "HEMATOLOGY"
-- appeared one under the other — a duplicate with the wrong spelling.
--
-- Correct the spelling to "HAEMATOLOGY". Once the panel heading equals the department, the renderer
-- drops the duplicate sub-heading automatically, so the section title shows exactly once.
UPDATE panels
   SET report_heading = REPLACE(report_heading, 'HEMATOLOGY', 'HAEMATOLOGY')
 WHERE report_heading LIKE '%HEMATOLOGY%' AND report_heading NOT LIKE '%HAEMATOLOGY%';

UPDATE panels
   SET name = REPLACE(name, 'HEMATOLOGY', 'HAEMATOLOGY')
 WHERE name LIKE '%HEMATOLOGY%' AND name NOT LIKE '%HAEMATOLOGY%';
