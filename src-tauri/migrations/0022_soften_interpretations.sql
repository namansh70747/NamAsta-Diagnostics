-- ============================================================
-- Migration 0022 : soften two interpretations to fully conservative wording
-- ============================================================
-- A lab report should describe, not diagnose. The LFT and KFT summaries used "indicate";
-- re-phrase to "suggest" so no result is over-claimed. All other interpretations already use
-- hedged language ("suggests", "may", "correlate clinically", "does not rule out").

UPDATE tests SET interpretation_note =
'Raised SGOT/SGPT suggest hepatocellular injury; a raised Alkaline Phosphatase/GGT pattern suggests cholestasis. Raised bilirubin with normal enzymes may indicate haemolysis or Gilbert''s syndrome. Low albumin or a reversed A:G ratio may reflect chronic liver disease. Interpret together with clinical findings.'
WHERE code = 'OT';

UPDATE tests SET interpretation_note =
'Raised Urea and Creatinine with a reduced eGFR suggest impaired renal function. Electrolyte (Na/K) disturbances need urgent clinical correlation. A single abnormal value should be confirmed and interpreted with hydration status and clinical context.'
WHERE code = 'UREA';

INSERT OR IGNORE INTO schema_migrations(version) VALUES('0022');
