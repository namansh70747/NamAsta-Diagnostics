-- ============================================================
-- Migration 0021 : standard interpretations / remarks for the tests that warrant them
-- ============================================================
-- Adds the conventional remark boxes for infectious serology, tumour markers, inflammatory
-- markers and vitamins. Text is standard, conservative clinical wording. Tests that
-- conventionally print a reference range only (electrolytes, single hormones, enzymes, urine)
-- are intentionally left without a prose box.

-- ── Infectious serology — method + confirmation / window-period remarks ──
UPDATE tests SET interpretation_note =
'Method: rapid immunochromatographic screening. A reactive result should be confirmed by ELISA before being reported as positive. A non-reactive result does not exclude infection in the early (window) period.'
WHERE code = 'HBSAG';

UPDATE tests SET interpretation_note =
'Method: rapid immunochromatographic screening for antibodies to Hepatitis C. A reactive result should be confirmed by ELISA / HCV-RNA. A non-reactive result does not exclude early infection.'
WHERE code = 'HCV';

UPDATE tests SET interpretation_note =
'Method: rapid screening test for HIV 1 & 2 antibodies. Reactive samples must be confirmed by additional/confirmatory assays as per NACO guidelines before being reported as positive. A non-reactive result does not exclude infection in the window period. This test is performed with consent for screening purposes only.'
WHERE code = 'HIV';

UPDATE tests SET interpretation_note =
'Non-treponemal screening test for syphilis. Reactive samples should be confirmed by a treponemal test (TPHA). Biological false-positive reactions can occur in pregnancy and some other conditions.'
WHERE code = 'VDRL';

UPDATE tests SET interpretation_note =
'Dengue NS1 antigen is most useful in early infection (days 1-5 of fever). A negative result does not rule out dengue; correlate with IgM/IgG and the clinical picture.'
WHERE code = 'NS1';

UPDATE tests SET interpretation_note =
'Rapid malaria antigen test. A negative result does not rule out malaria; examination of a peripheral blood smear is recommended where clinically suspected.'
WHERE code = 'MPA';

UPDATE tests SET interpretation_note =
'Rapid card test for typhoid antibodies; it is a screening test and not confirmatory. Correlate with the Widal test, blood culture and clinical findings.'
WHERE code = 'TYPHI';

-- ── Tumour markers — monitoring, not standalone diagnosis ──
UPDATE tests SET interpretation_note =
'PSA may be raised in benign prostatic hyperplasia, prostatitis and after instrumentation, not only in malignancy. Interpret with age and clinical findings; chiefly useful for monitoring.'
WHERE code = 'PSA';

UPDATE tests SET interpretation_note =
'Tumour markers are used mainly to monitor a known malignancy and its response to treatment, not for screening or diagnosis in isolation. Mild elevations can occur in benign conditions. Correlate clinically.'
WHERE code IN ('CEA', 'AFP', 'CA125', 'CA153', 'CA199');

-- ── Inflammatory / immunology ──
UPDATE tests SET interpretation_note =
'C-Reactive Protein is a non-specific acute-phase reactant; it is raised in infection, inflammation and tissue injury. Interpret with the clinical picture.'
WHERE code = 'CRP';

UPDATE tests SET interpretation_note =
'A raised ASO titre indicates recent streptococcal infection. A single raised value should be confirmed with a repeat sample after 2 weeks to look for a rising titre.'
WHERE code = 'ASO';

UPDATE tests SET interpretation_note =
'Rheumatoid Factor can be positive in healthy elderly individuals and in conditions other than rheumatoid arthritis. Correlate with clinical findings and anti-CCP.'
WHERE code = 'RA';

UPDATE tests SET interpretation_note =
'ESR is a non-specific marker; it is raised in infection, inflammation, anaemia and pregnancy. Interpret together with CRP and the clinical picture.'
WHERE code = 'ESR';

-- ── Vitamins — deficiency bands ──
UPDATE tests SET interpretation_note =
'Deficiency: < 20 ng/mL  |  Insufficiency: 20-29 ng/mL  |  Sufficiency: 30-100 ng/mL  |  Possible toxicity: > 100 ng/mL.'
WHERE code = 'VITD';

UPDATE tests SET interpretation_note =
'Deficiency: < 200 pg/mL  |  Borderline: 200-300 pg/mL  |  Normal: > 300 pg/mL. Levels may be falsely normal in some conditions; correlate clinically.'
WHERE code = 'VTB';

UPDATE tests SET interpretation_note =
'Ferritin reflects body iron stores but is also an acute-phase reactant and can be raised by infection/inflammation independent of iron status. Interpret with iron studies and CRP.'
WHERE code = 'FER';

INSERT OR IGNORE INTO schema_migrations(version) VALUES('0021');
