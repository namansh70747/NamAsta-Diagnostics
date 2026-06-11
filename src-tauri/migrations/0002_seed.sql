-- ============================================================
-- SCL Lab App  –  Migration 0002 : Seed Data
-- ============================================================

-- ============================================================
-- Panels
-- ============================================================
INSERT OR IGNORE INTO panels(code, name, report_heading, sort_order, page_break_after) VALUES
    ('HEM',   'HEMATOLOGY',                        'HEMATOLOGY',                        10,  0),
    ('CBC',   'COMPLETE BLOOD COUNT (CBC)',         'COMPLETE BLOOD COUNT (CBC)',         11,  1),
    ('BIO',   'BIOCHEMISTRY',                       'BIOCHEMISTRY',                       20,  0),
    ('LFT',   'LIVER FUNCTION TEST (LFT)',          'LIVER FUNCTION TEST (LFT)',          21,  0),
    ('KFT',   'RENAL FUNCTION TEST (RFT/KFT)',      'RENAL FUNCTION TEST (RFT/KFT)',      22,  0),
    ('LIPID', 'LIPID PROFILE',                      'LIPID PROFILE',                      23,  0),
    ('ELEC',  'ELECTROLYTES',                       'ELECTROLYTES',                       24,  0),
    ('DIAB',  'DIABETIC PROFILE',                   'DIABETIC PROFILE',                   25,  0),
    ('THY',   'THYROID PROFILE',                    'THYROID PROFILE',                    30,  0),
    ('HORM',  'HORMONES',                           'HORMONES',                           31,  0),
    ('SERO',  'SEROLOGY',                           'SEROLOGY',                           40,  0),
    ('COAG',  'COAGULATION',                        'COAGULATION',                        45,  0),
    ('URINE', 'URINE EXAMINATION',                  'URINE EXAMINATION',                  50,  1),
    ('STOOL', 'STOOL EXAMINATION',                  'STOOL EXAMINATION',                  55,  0),
    ('FLUID', 'BODY FLUID',                         'BODY FLUID',                         60,  0),
    ('MICRO', 'MICROBIOLOGY',                       'MICROBIOLOGY',                       65,  0),
    ('MISC',  'MISCELLANEOUS',                      'MISCELLANEOUS',                      90,  0);

-- ============================================================
-- Tests
-- ============================================================

-- ── HEMATOLOGY ───────────────────────────────────────────────
INSERT OR IGNORE INTO tests(code, name, panel_id, result_type, unit, decimals, price, enabled, sort_order, choices, default_value, formula, interpretation_note, needs_review) VALUES
    ('HB',    'Haemoglobin',           (SELECT id FROM panels WHERE code='HEM'), 'numeric',  'gm/dl',  1, 30,  1, 10,  NULL, NULL, NULL, NULL, 0),
    ('TLC',   'Total Leucocyte Count', (SELECT id FROM panels WHERE code='HEM'), 'numeric',  '/cumm',  0, 30,  1, 20,  NULL, NULL, NULL, NULL, 0),
    ('DLC',   'Differential Leucocyte Count', (SELECT id FROM panels WHERE code='HEM'), 'text', '%', 0, 40,  1, 30,  NULL, NULL, NULL, NULL, 0),
    ('PLT',   'Platelet Count',        (SELECT id FROM panels WHERE code='HEM'), 'numeric',  '/cumm',  0, 100, 1, 40,  NULL, NULL, NULL, NULL, 0),
    ('ESR',   'Erythrocyte Sedimentation Rate', (SELECT id FROM panels WHERE code='HEM'), 'numeric', 'mm/hr', 0, 50, 1, 50, NULL, NULL, NULL, NULL, 0),
    ('AEC',   'Absolute Eosinophil Count', (SELECT id FROM panels WHERE code='HEM'), 'numeric', '/cumm', 0, 150, 1, 60, NULL, NULL, NULL, NULL, 0),
    ('PCV',   'Packed Cell Volume',    (SELECT id FROM panels WHERE code='HEM'), 'numeric',  '%',      1, 0,   1, 70,  NULL, NULL, NULL, NULL, 0),
    ('PBF',   'Peripheral Blood Film', (SELECT id FROM panels WHERE code='HEM'), 'text',     '—',      0, 150, 1, 80,  NULL, NULL, NULL, NULL, 1),
    ('ABO',   'Blood Group & Rh Type', (SELECT id FROM panels WHERE code='HEM'), 'choice',   '—',      0, 30,  1, 90,  '["A+","A-","B+","B-","AB+","AB-","O+","O-"]', NULL, NULL, NULL, 0),
    ('BT',    'Bleeding Time',         (SELECT id FROM panels WHERE code='HEM'), 'numeric',  'min',    1, 20,  1, 100, NULL, NULL, NULL, NULL, 0),
    ('CT',    'Clotting Time',         (SELECT id FROM panels WHERE code='HEM'), 'numeric',  'min',    1, 20,  1, 110, NULL, NULL, NULL, NULL, 0);

-- ── CBC (Complete Blood Count sub-parameters) ────────────────
INSERT OR IGNORE INTO tests(code, name, panel_id, result_type, unit, decimals, price, enabled, sort_order) VALUES
    ('WBC',     'WBC',                   (SELECT id FROM panels WHERE code='CBC'), 'numeric', '10^3/µL', 2, 0,   1, 1),
    ('LYM_PCT', 'LYM%',                  (SELECT id FROM panels WHERE code='CBC'), 'numeric', '%',       1, 0,   1, 2),
    ('MID_PCT', 'MID%',                  (SELECT id FROM panels WHERE code='CBC'), 'numeric', '%',       1, 0,   1, 3),
    ('GRAN_PCT','GRA%',                  (SELECT id FROM panels WHERE code='CBC'), 'numeric', '%',       1, 0,   1, 4),
    ('LYM_NUM', 'LYM#',                  (SELECT id FROM panels WHERE code='CBC'), 'numeric', '10^3/µL', 2, 0,   1, 5),
    ('MID_NUM', 'MID#',                  (SELECT id FROM panels WHERE code='CBC'), 'numeric', '10^3/µL', 2, 0,   1, 6),
    ('GRAN_NUM','GRA#',                  (SELECT id FROM panels WHERE code='CBC'), 'numeric', '10^3/µL', 2, 0,   1, 7),
    ('RBC_CNT', 'RBC',                   (SELECT id FROM panels WHERE code='CBC'), 'numeric', '10^6/µL', 2, 0,   1, 8),
    ('HGB',     'HGB',                   (SELECT id FROM panels WHERE code='CBC'), 'numeric', 'g/dL',    1, 0,   1, 9),
    ('HCT',     'HCT',                   (SELECT id FROM panels WHERE code='CBC'), 'numeric', '%',       1, 0,   1, 10),
    ('MCV',     'MCV',                   (SELECT id FROM panels WHERE code='CBC'), 'numeric', 'fL',      1, 0,   1, 11),
    ('MCH',     'MCH',                   (SELECT id FROM panels WHERE code='CBC'), 'numeric', 'pg',      1, 0,   1, 12),
    ('MCHC',    'MCHC',                  (SELECT id FROM panels WHERE code='CBC'), 'numeric', 'g/dL',    1, 0,   1, 13),
    ('RDW_SD',  'RDW-SD',                (SELECT id FROM panels WHERE code='CBC'), 'numeric', 'fL',      1, 0,   1, 14),
    ('RDW_CV',  'RDW-CV',                (SELECT id FROM panels WHERE code='CBC'), 'numeric', '%',       1, 0,   1, 15),
    ('PLT_CBC', 'PLT',                   (SELECT id FROM panels WHERE code='CBC'), 'numeric', '10^3/µL', 0, 0,   1, 16),
    ('MPV',     'MPV',                   (SELECT id FROM panels WHERE code='CBC'), 'numeric', 'fL',      1, 0,   1, 17),
    ('PCT_CBC', 'PCT',                   (SELECT id FROM panels WHERE code='CBC'), 'numeric', '%',       3, 0,   1, 18),
    ('PDW_SD',  'PDW-SD',                (SELECT id FROM panels WHERE code='CBC'), 'numeric', 'fL',      1, 0,   1, 19),
    ('PDW_CV',  'PDW-CV',                (SELECT id FROM panels WHERE code='CBC'), 'numeric', '%',       1, 0,   1, 20),
    ('PLCR',    'P-LCR',                 (SELECT id FROM panels WHERE code='CBC'), 'numeric', '%',       1, 0,   1, 21),
    ('PLCC',    'P-LCC',                 (SELECT id FROM panels WHERE code='CBC'), 'numeric', '10^3/µL', 2, 0,   1, 22);

-- ── BIOCHEMISTRY (misc) ──────────────────────────────────────
INSERT OR IGNORE INTO tests(code, name, panel_id, result_type, unit, decimals, price, enabled, sort_order, needs_review) VALUES
    ('CPKM',  'CPK-MB',                       (SELECT id FROM panels WHERE code='BIO'), 'numeric', 'U/L',    0, 600, 1, 10, 0),
    ('CPKN',  'CPK-NAC (Total)',               (SELECT id FROM panels WHERE code='BIO'), 'numeric', 'U/L',    0, 450, 1, 20, 0),
    ('LDH1',  'LDH',                           (SELECT id FROM panels WHERE code='BIO'), 'numeric', 'U/L',    0, 300, 1, 30, 0),
    ('ACP',   'Acid Phosphatase',              (SELECT id FROM panels WHERE code='BIO'), 'numeric', 'U/L',    1, 350, 1, 40, 0),
    ('LPA',   'Lp(a)',                         (SELECT id FROM panels WHERE code='BIO'), 'numeric', 'mg/dL',  1, 400, 1, 50, 0),
    ('AMY',   'Amylase',                       (SELECT id FROM panels WHERE code='BIO'), 'numeric', 'U/L',    0, 400, 1, 60, 0),
    ('IRON',  'Serum Iron',                    (SELECT id FROM panels WHERE code='BIO'), 'numeric', 'µg/dL',  1, 200, 1, 70, 0),
    ('TIBC',  'TIBC',                          (SELECT id FROM panels WHERE code='BIO'), 'numeric', 'µg/dL',  1, 450, 1, 80, 0),
    ('FOL',   'Folic Acid',                    (SELECT id FROM panels WHERE code='BIO'), 'numeric', 'ng/mL',  2, 800, 1, 90, 0),
    ('G6QT',  'G6PD Quantitative',             (SELECT id FROM panels WHERE code='BIO'), 'numeric', 'U/gHb',  1, 260, 1, 100, 0),
    ('OCB',   'Occult Blood',                  (SELECT id FROM panels WHERE code='BIO'), 'choice',  '—',      0, 100, 1, 110, 0),
    ('AMM',   'Ammonia',                       (SELECT id FROM panels WHERE code='BIO'), 'numeric', 'µmol/L', 1, 700, 1, 120, 0),
    ('VTB',   'Vitamin B12',                   (SELECT id FROM panels WHERE code='BIO'), 'numeric', 'pg/mL',  1, 900, 1, 130, 0),
    ('VITD',  'Vitamin D (25-OH)',             (SELECT id FROM panels WHERE code='BIO'), 'numeric', 'ng/mL',  2, 700, 1, 140, 0),
    ('FER',   'Ferritin',                      (SELECT id FROM panels WHERE code='BIO'), 'numeric', 'ng/mL',  2, 600, 1, 150, 0),
    ('HSCRP', 'hs-CRP',                        (SELECT id FROM panels WHERE code='BIO'), 'numeric', 'mg/L',   2, 550, 1, 160, 0);

INSERT OR IGNORE INTO tests(code, name, panel_id, result_type, unit, decimals, price, enabled, sort_order, choices) VALUES
    ('OCB',   'Occult Blood', (SELECT id FROM panels WHERE code='BIO'), 'choice', '—', 0, 100, 1, 110, '["Negative","Positive"]');

-- ── LFT ─────────────────────────────────────────────────────
INSERT OR IGNORE INTO tests(code, name, panel_id, result_type, unit, decimals, price, enabled, sort_order, formula) VALUES
    ('BBT',    'Bilirubin Total',           (SELECT id FROM panels WHERE code='LFT'), 'numeric',    'mg/dL', 2, 50,  1, 10,  NULL),
    ('BBD',    'Bilirubin Direct',          (SELECT id FROM panels WHERE code='LFT'), 'numeric',    'mg/dL', 2, 0,   1, 20,  NULL),
    ('BBI',    'Bilirubin Indirect',        (SELECT id FROM panels WHERE code='LFT'), 'calculated', 'mg/dL', 2, 0,   1, 30,  'BBT - BBD'),
    ('OT',     'SGOT (AST)',                (SELECT id FROM panels WHERE code='LFT'), 'numeric',    'U/L',   0, 50,  1, 40,  NULL),
    ('PT_ALT', 'SGPT (ALT)',                (SELECT id FROM panels WHERE code='LFT'), 'numeric',    'U/L',   0, 50,  1, 50,  NULL),
    ('ALP',    'Alkaline Phosphatase',      (SELECT id FROM panels WHERE code='LFT'), 'numeric',    'U/L',   1, 180, 1, 60,  NULL),
    ('BGGT',   'GGTP',                      (SELECT id FROM panels WHERE code='LFT'), 'numeric',    'U/L',   2, 200, 1, 70,  NULL),
    ('TPN',    'Total Protein',             (SELECT id FROM panels WHERE code='LFT'), 'numeric',    'g/dL',  2, 100, 1, 80,  NULL),
    ('ALB',    'Albumin',                   (SELECT id FROM panels WHERE code='LFT'), 'numeric',    'g/dL',  2, 100, 1, 90,  NULL),
    ('GLO',    'Globulin',                  (SELECT id FROM panels WHERE code='LFT'), 'calculated', 'g/dL',  2, 100, 1, 100, 'TPN - ALB'),
    ('BAG',    'A/G Ratio',                 (SELECT id FROM panels WHERE code='LFT'), 'calculated', '',      2, 0,   1, 110, 'ALB / GLO');

-- ── KFT ─────────────────────────────────────────────────────
INSERT OR IGNORE INTO tests(code, name, panel_id, result_type, unit, decimals, price, enabled, sort_order, formula) VALUES
    ('UREA',  'Blood Urea',               (SELECT id FROM panels WHERE code='KFT'), 'numeric',    'mg/dL',  1, 50,  1, 10,  NULL),
    ('BUN',   'Blood Urea Nitrogen',      (SELECT id FROM panels WHERE code='KFT'), 'numeric',    'mg/dL',  1, 50,  1, 20,  NULL),
    ('CRT',   'Serum Creatinine',         (SELECT id FROM panels WHERE code='KFT'), 'numeric',    'mg/dL',  2, 50,  1, 30,  NULL),
    ('UA',    'Uric Acid',                (SELECT id FROM panels WHERE code='KFT'), 'numeric',    'mg/dL',  1, 50,  1, 40,  NULL),
    ('CAL',   'Calcium',                  (SELECT id FROM panels WHERE code='KFT'), 'numeric',    'mg/dL',  1, 100, 1, 50,  NULL),
    ('BCALI', 'Ionized Calcium',          (SELECT id FROM panels WHERE code='KFT'), 'numeric',    'mmol/L', 2, 50,  1, 60,  NULL),
    ('PHO',   'Phosphorus',               (SELECT id FROM panels WHERE code='KFT'), 'numeric',    'mg/dL',  1, 200, 1, 70,  NULL),
    ('MAG',   'Magnesium',                (SELECT id FROM panels WHERE code='KFT'), 'numeric',    'mg/dL',  1, 500, 1, 80,  NULL),
    ('LIT',   'Lithium',                  (SELECT id FROM panels WHERE code='KFT'), 'numeric',    'mEq/L',  2, 500, 1, 90,  NULL),
    ('MAU',   'Microalbumin (Urine)',     (SELECT id FROM panels WHERE code='KFT'), 'numeric',    'mg/L',   1, 400, 1, 100, NULL),
    ('BC',    'Bicarbonate',              (SELECT id FROM panels WHERE code='KFT'), 'numeric',    'mmol/L', 1, 450, 1, 110, NULL),
    ('GFR',   'eGFR (CKD-EPI)',          (SELECT id FROM panels WHERE code='KFT'), 'calculated', 'mL/min/1.73m²', 1, 50, 1, 120, 'CKD-EPI');

-- ── LIPID ────────────────────────────────────────────────────
INSERT OR IGNORE INTO tests(code, name, panel_id, result_type, unit, decimals, price, enabled, sort_order, formula) VALUES
    ('CHOL',  'Total Cholesterol',         (SELECT id FROM panels WHERE code='LIPID'), 'numeric',    'mg/dL', 1, 50,  1, 10, NULL),
    ('TG',    'Triglycerides',             (SELECT id FROM panels WHERE code='LIPID'), 'numeric',    'mg/dL', 1, 150, 1, 20, NULL),
    ('BHDL',  'HDL Cholesterol',           (SELECT id FROM panels WHERE code='LIPID'), 'numeric',    'mg/dL', 1, 150, 1, 30, NULL),
    ('BLDL',  'LDL Cholesterol',           (SELECT id FROM panels WHERE code='LIPID'), 'numeric',    'mg/dL', 1, 100, 1, 40, NULL),
    ('BVLDL', 'VLDL Cholesterol',          (SELECT id FROM panels WHERE code='LIPID'), 'calculated', 'mg/dL', 1, 100, 1, 50, 'TG / 5'),
    ('BRAT',  'Total Chol / HDL Ratio',   (SELECT id FROM panels WHERE code='LIPID'), 'calculated', '',      2, 0,   1, 60, 'CHOL / BHDL'),
    ('BLHR',  'LDL / HDL Ratio',          (SELECT id FROM panels WHERE code='LIPID'), 'calculated', '',      2, 0,   1, 70, 'BLDL / BHDL'),
    ('NHDL',  'Non-HDL Cholesterol',       (SELECT id FROM panels WHERE code='LIPID'), 'calculated', 'mg/dL', 1, 0,   1, 80, 'CHOL - BHDL');

-- ── ELECTROLYTES ─────────────────────────────────────────────
INSERT OR IGNORE INTO tests(code, name, panel_id, result_type, unit, decimals, price, enabled, sort_order) VALUES
    ('NA',  'Sodium',    (SELECT id FROM panels WHERE code='ELEC'), 'numeric', 'mEq/L', 1, 100, 1, 10),
    ('K',   'Potassium', (SELECT id FROM panels WHERE code='ELEC'), 'numeric', 'mEq/L', 1, 100, 1, 20),
    ('CL',  'Chloride',  (SELECT id FROM panels WHERE code='ELEC'), 'numeric', 'mEq/L', 1, 100, 1, 30);

-- ── DIABETIC PROFILE ─────────────────────────────────────────
INSERT OR IGNORE INTO tests(code, name, panel_id, result_type, unit, decimals, price, enabled, sort_order, formula) VALUES
    ('FBS',   'Fasting Blood Sugar',          (SELECT id FROM panels WHERE code='DIAB'), 'numeric',    'mg/dL', 0, 20,  1, 10, NULL),
    ('RBS',   'Random Blood Sugar',           (SELECT id FROM panels WHERE code='DIAB'), 'numeric',    'mg/dL', 0, 20,  1, 20, NULL),
    ('PPBS',  'Post Prandial Blood Sugar',    (SELECT id FROM panels WHERE code='DIAB'), 'numeric',    'mg/dL', 0, 20,  1, 30, NULL),
    ('HBA1C', 'Glycated Haemoglobin (HbA1c)', (SELECT id FROM panels WHERE code='DIAB'), 'numeric',   '%',     1, 350, 1, 40, NULL),
    ('EAG',   'Estimated Average Glucose',   (SELECT id FROM panels WHERE code='DIAB'), 'calculated', 'mg/dL', 1, 0,   1, 50, '28.7 * HBA1C - 46.7');

-- ── THYROID ──────────────────────────────────────────────────
INSERT OR IGNORE INTO tests(code, name, panel_id, result_type, unit, decimals, price, enabled, sort_order) VALUES
    ('TSH', 'TSH (Thyroid Stimulating Hormone)', (SELECT id FROM panels WHERE code='THY'), 'numeric', 'µIU/mL', 3, 200, 1, 10),
    ('T3',  'T3 (Triiodothyronine)',              (SELECT id FROM panels WHERE code='THY'), 'numeric', 'ng/dL',  2, 250, 1, 20),
    ('T4',  'T4 (Thyroxine)',                     (SELECT id FROM panels WHERE code='THY'), 'numeric', 'µg/dL',  2, 250, 1, 30),
    ('FT3', 'Free T3',                            (SELECT id FROM panels WHERE code='THY'), 'numeric', 'pg/mL',  2, 250, 1, 40),
    ('FT4', 'Free T4',                            (SELECT id FROM panels WHERE code='THY'), 'numeric', 'ng/dL',  2, 300, 1, 50);

-- ── HORMONES ─────────────────────────────────────────────────
INSERT OR IGNORE INTO tests(code, name, panel_id, result_type, unit, decimals, price, enabled, sort_order) VALUES
    ('LH',     'LH (Luteinizing Hormone)',           (SELECT id FROM panels WHERE code='HORM'), 'numeric', 'mIU/mL', 2, 450,  1, 10),
    ('FSH',    'FSH (Follicle Stimulating Hormone)', (SELECT id FROM panels WHERE code='HORM'), 'numeric', 'mIU/mL', 2, 450,  1, 20),
    ('PRL',    'Prolactin',                          (SELECT id FROM panels WHERE code='HORM'), 'numeric', 'ng/mL',  2, 490,  1, 30),
    ('PROG',   'Progesterone',                       (SELECT id FROM panels WHERE code='HORM'), 'numeric', 'ng/mL',  2, 500,  1, 40),
    ('TESTO',  'Testosterone',                       (SELECT id FROM panels WHERE code='HORM'), 'numeric', 'ng/dL',  2, 550,  1, 50),
    ('E2',     'Estradiol (E2)',                     (SELECT id FROM panels WHERE code='HORM'), 'numeric', 'pg/mL',  2, 500,  1, 60),
    ('AMH',    'Anti-Mullerian Hormone',             (SELECT id FROM panels WHERE code='HORM'), 'numeric', 'ng/mL',  2, 1850, 1, 70),
    ('DHEA',   'DHEA-S',                             (SELECT id FROM panels WHERE code='HORM'), 'numeric', 'µg/dL',  2, 800,  1, 80),
    ('INS',    'Insulin (Fasting)',                  (SELECT id FROM panels WHERE code='HORM'), 'numeric', 'µIU/mL', 2, 550,  1, 90),
    ('INSPP',  'Insulin (Post Prandial)',             (SELECT id FROM panels WHERE code='HORM'), 'numeric', 'µIU/mL', 2, 550,  1, 100),
    ('CORT',   'Cortisol',                           (SELECT id FROM panels WHERE code='HORM'), 'numeric', 'µg/dL',  2, 750,  1, 110),
    ('HGH',    'Growth Hormone (HGH)',               (SELECT id FROM panels WHERE code='HORM'), 'numeric', 'ng/mL',  2, 600,  1, 120),
    ('BETA',   'Beta-hCG',                           (SELECT id FROM panels WHERE code='HORM'), 'numeric', 'mIU/mL', 2, 600,  1, 130),
    ('PTH',    'Parathyroid Hormone (PTH)',           (SELECT id FROM panels WHERE code='HORM'), 'numeric', 'pg/mL',  1, 1000, 1, 140);

-- ── SEROLOGY ─────────────────────────────────────────────────
INSERT OR IGNORE INTO tests(code, name, panel_id, result_type, unit, decimals, price, enabled, sort_order, choices) VALUES
    ('WIDAL',  'Widal Test',                      (SELECT id FROM panels WHERE code='SERO'), 'text',   '—',    0, 50,   1, 10,  NULL),
    ('CRP',    'C-Reactive Protein',              (SELECT id FROM panels WHERE code='SERO'), 'numeric','mg/L', 1, 200,  1, 20,  NULL),
    ('ASO',    'ASO Titre',                       (SELECT id FROM panels WHERE code='SERO'), 'numeric','IU/mL',0, 200,  1, 30,  NULL),
    ('RA',     'RA Factor',                       (SELECT id FROM panels WHERE code='SERO'), 'numeric','IU/mL',0, 450,  1, 40,  NULL),
    ('HBSAG',  'HBsAg (Hepatitis B Surface Ag)',  (SELECT id FROM panels WHERE code='SERO'), 'choice', '—',   0, 100,  1, 50,  '["Non-Reactive","Reactive"]'),
    ('HCV',    'Anti-HCV (Hepatitis C)',          (SELECT id FROM panels WHERE code='SERO'), 'choice', '—',   0, 400,  1, 60,  '["Non-Reactive","Reactive"]'),
    ('HIV',    'HIV 1 & 2 (Rapid)',               (SELECT id FROM panels WHERE code='SERO'), 'choice', '—',   0, 250,  1, 70,  '["Non-Reactive","Reactive"]'),
    ('VDRL',   'VDRL',                            (SELECT id FROM panels WHERE code='SERO'), 'choice', '—',   0, 100,  1, 80,  '["Non-Reactive","Reactive"]'),
    ('MPA',    'Malaria Antigen (P.f & P.v)',     (SELECT id FROM panels WHERE code='SERO'), 'choice', '—',   0, 100,  1, 90,  '["Negative","P.falciparum","P.vivax","Both"]'),
    ('NS1',    'NS1 Antigen (Dengue)',            (SELECT id FROM panels WHERE code='SERO'), 'choice', '—',   0, 450,  1, 100, '["Non-Reactive","Reactive"]'),
    ('TYPHI',  'Typhoid IgM/IgG',                (SELECT id FROM panels WHERE code='SERO'), 'choice', '—',   0, 300,  1, 110, '["Negative","IgM Positive","IgG Positive","Both Positive"]'),
    ('PSA',    'PSA (Prostate Specific Antigen)', (SELECT id FROM panels WHERE code='SERO'), 'numeric','ng/mL',2, 650,  1, 120, NULL),
    ('CEA',    'CEA',                             (SELECT id FROM panels WHERE code='SERO'), 'numeric','ng/mL',2, 750,  1, 130, NULL),
    ('AFP',    'AFP (Alpha-Feto Protein)',         (SELECT id FROM panels WHERE code='SERO'), 'numeric','IU/mL',2, 850,  1, 140, NULL),
    ('CA125',  'CA-125',                          (SELECT id FROM panels WHERE code='SERO'), 'numeric','U/mL', 2, 1000, 1, 150, NULL),
    ('CA199',  'CA 19-9',                         (SELECT id FROM panels WHERE code='SERO'), 'numeric','U/mL', 2, 1000, 1, 160, NULL),
    ('CA153',  'CA 15-3',                         (SELECT id FROM panels WHERE code='SERO'), 'numeric','U/mL', 2, 900,  1, 170, NULL),
    ('UPT',    'Urine Pregnancy Test (UPT)',      (SELECT id FROM panels WHERE code='SERO'), 'choice', '—',   0, 30,   1, 180, '["Negative","Positive"]');

-- ── COAGULATION ──────────────────────────────────────────────
INSERT OR IGNORE INTO tests(code, name, panel_id, result_type, unit, decimals, price, enabled, sort_order, choices) VALUES
    ('PT_PT',  'Prothrombin Time (PT)',   (SELECT id FROM panels WHERE code='COAG'), 'numeric', 'sec',  1, 200, 1, 10, NULL),
    ('APTT',   'APTT',                   (SELECT id FROM panels WHERE code='COAG'), 'numeric', 'sec',  1, 350, 1, 20, NULL),
    ('DDIMER', 'D-Dimer',                (SELECT id FROM panels WHERE code='COAG'), 'numeric', 'µg/mL FEU', 2, 900, 1, 30, NULL),
    ('TROP',   'Troponin I (Rapid)',     (SELECT id FROM panels WHERE code='COAG'), 'choice',  '—',   0, 900, 1, 40, '["Negative","Positive"]');

-- ── URINE EXAMINATION ────────────────────────────────────────
INSERT OR IGNORE INTO tests(code, name, panel_id, result_type, unit, decimals, price, enabled, sort_order, choices, default_value) VALUES
    ('U_COLOUR',   'Colour',           (SELECT id FROM panels WHERE code='URINE'), 'choice',  '—',  0, 0, 1, 10, '["Pale Yellow","Yellow","Amber","Dark Yellow","Colourless","Brown","Red","Orange"]', 'Yellow'),
    ('U_APP',      'Appearance',       (SELECT id FROM panels WHERE code='URINE'), 'choice',  '—',  0, 0, 1, 20, '["Clear","Slightly Turbid","Turbid","Hazy"]', 'Clear'),
    ('U_REACT',    'Reaction (pH)',    (SELECT id FROM panels WHERE code='URINE'), 'numeric', '',   1, 0, 1, 30, NULL, NULL),
    ('U_SG',       'Specific Gravity', (SELECT id FROM panels WHERE code='URINE'), 'numeric', '',   3, 0, 1, 40, NULL, NULL),
    ('U_PROTEIN',  'Protein',          (SELECT id FROM panels WHERE code='URINE'), 'choice',  '—',  0, 0, 1, 50, '["Nil","Trace","+","++","+++","Positive","Negative"]', 'Nil'),
    ('U_GLUCOSE',  'Glucose',          (SELECT id FROM panels WHERE code='URINE'), 'choice',  '—',  0, 0, 1, 60, '["Nil","Trace","+","++","+++","Positive","Negative"]', 'Nil'),
    ('U_KETONE',   'Ketone Bodies',    (SELECT id FROM panels WHERE code='URINE'), 'choice',  '—',  0, 0, 1, 70, '["Nil","Trace","+","++","+++","Positive","Negative"]', 'Nil'),
    ('U_BLOOD',    'Blood',            (SELECT id FROM panels WHERE code='URINE'), 'choice',  '—',  0, 0, 1, 80, '["Nil","Trace","+","++","+++","Positive","Negative"]', 'Nil'),
    ('U_BILE_S',   'Bile Salts',       (SELECT id FROM panels WHERE code='URINE'), 'choice',  '—',  0, 0, 1, 90, '["Nil","Present","Absent"]', 'Nil'),
    ('U_BILE_P',   'Bile Pigments',    (SELECT id FROM panels WHERE code='URINE'), 'choice',  '—',  0, 0, 1, 100,'["Nil","Present","Absent"]', 'Nil'),
    ('U_URO',      'Urobilinogen',     (SELECT id FROM panels WHERE code='URINE'), 'choice',  '—',  0, 0, 1, 110,'["Normal","Increased","Decreased"]', 'Normal'),
    ('U_NITRITE',  'Nitrite',          (SELECT id FROM panels WHERE code='URINE'), 'choice',  '—',  0, 0, 1, 120,'["Negative","Positive"]', 'Negative'),
    ('U_PUS',      'Pus Cells',        (SELECT id FROM panels WHERE code='URINE'), 'numeric', '/hpf',0, 0, 1, 130, NULL, NULL),
    ('U_RBC',      'RBCs',             (SELECT id FROM panels WHERE code='URINE'), 'numeric', '/hpf',0, 0, 1, 140, NULL, NULL),
    ('U_EPIT',     'Epithelial Cells', (SELECT id FROM panels WHERE code='URINE'), 'choice',  '—',  0, 0, 1, 150,'["Nil","Few","Moderate","Many"]', 'Nil'),
    ('U_CAST',     'Casts',            (SELECT id FROM panels WHERE code='URINE'), 'choice',  '—',  0, 0, 1, 160,'["Nil","Hyaline","Granular","RBC Cast","WBC Cast","Waxy"]', 'Nil'),
    ('U_CRYSTAL',  'Crystals',         (SELECT id FROM panels WHERE code='URINE'), 'choice',  '—',  0, 0, 1, 170,'["Nil","Uric Acid","Calcium Oxalate","Triple Phosphate","Amorphous Urates","Calcium Carbonate"]', 'Nil'),
    ('U_BACTERIA', 'Bacteria',         (SELECT id FROM panels WHERE code='URINE'), 'choice',  '—',  0, 0, 1, 180,'["Nil","Few","Moderate","Plenty"]', 'Nil');

-- ── STOOL EXAMINATION ────────────────────────────────────────
INSERT OR IGNORE INTO tests(code, name, panel_id, result_type, unit, decimals, price, enabled, sort_order) VALUES
    ('STOOL_EXAM', 'Stool Examination', (SELECT id FROM panels WHERE code='STOOL'), 'text', '—', 0, 50, 1, 10);

-- ── BODY FLUID ───────────────────────────────────────────────
INSERT OR IGNORE INTO tests(code, name, panel_id, result_type, unit, decimals, price, enabled, sort_order) VALUES
    ('SEMEN', 'Semen Analysis', (SELECT id FROM panels WHERE code='FLUID'), 'text', '—', 0, 300, 1, 10);

-- ── MICROBIOLOGY ─────────────────────────────────────────────
INSERT OR IGNORE INTO tests(code, name, panel_id, result_type, unit, decimals, price, enabled, sort_order) VALUES
    ('BLOOD_CULT',  'Blood Culture & Sensitivity',   (SELECT id FROM panels WHERE code='MICRO'), 'text', '—', 0, 900, 1, 10),
    ('URINE_CULT',  'Urine Culture & Sensitivity',   (SELECT id FROM panels WHERE code='MICRO'), 'text', '—', 0, 400, 1, 20),
    ('PUS_CULT',    'Pus Culture & Sensitivity',     (SELECT id FROM panels WHERE code='MICRO'), 'text', '—', 0, 250, 1, 30),
    ('SPUTUM_CULT', 'Sputum Culture & Sensitivity',  (SELECT id FROM panels WHERE code='MICRO'), 'text', '—', 0, 100, 1, 40),
    ('AFB',         'AFB Staining',                  (SELECT id FROM panels WHERE code='MICRO'), 'text', '—', 0, 100, 1, 50),
    ('GRAM',        'Gram Staining',                 (SELECT id FROM panels WHERE code='MICRO'), 'text', '—', 0, 80,  1, 60);

-- ============================================================
-- Test Ranges
-- ============================================================

-- HB (Haemoglobin)
INSERT OR IGNORE INTO test_ranges(test_id, sex, low, high) VALUES
    ((SELECT id FROM tests WHERE code='HB'), 'M', 13.5, 17.5),
    ((SELECT id FROM tests WHERE code='HB'), 'F', 12.0, 16.0);

-- TLC
INSERT OR IGNORE INTO test_ranges(test_id, sex, low, high, range_text) VALUES
    ((SELECT id FROM tests WHERE code='TLC'), 'ANY', 4000, 11000, '4,000 - 11,000');

-- PLT
INSERT OR IGNORE INTO test_ranges(test_id, sex, low, high, range_text) VALUES
    ((SELECT id FROM tests WHERE code='PLT'), 'ANY', 150000, 450000, '1,50,000 - 4,50,000');

-- FBS
INSERT OR IGNORE INTO test_ranges(test_id, sex, low, high, range_text) VALUES
    ((SELECT id FROM tests WHERE code='FBS'), 'ANY', 70, 110, '70 - 110');

-- RBS
INSERT OR IGNORE INTO test_ranges(test_id, sex, low, high, range_text) VALUES
    ((SELECT id FROM tests WHERE code='RBS'), 'ANY', 70, 150, '70.0 - 150.0');

-- PPBS
INSERT OR IGNORE INTO test_ranges(test_id, sex, low, high) VALUES
    ((SELECT id FROM tests WHERE code='PPBS'), 'ANY', 70, 140);

-- Serum Creatinine
INSERT OR IGNORE INTO test_ranges(test_id, sex, low, high, range_text) VALUES
    ((SELECT id FROM tests WHERE code='CRT'), 'ANY', 0.60, 1.20, '0.60 - 1.20');

-- Urea
INSERT OR IGNORE INTO test_ranges(test_id, sex, low, high) VALUES
    ((SELECT id FROM tests WHERE code='UREA'), 'ANY', 15, 45);

-- BUN
INSERT OR IGNORE INTO test_ranges(test_id, sex, low, high) VALUES
    ((SELECT id FROM tests WHERE code='BUN'), 'ANY', 7, 20);

-- Uric Acid (sex-specific)
INSERT OR IGNORE INTO test_ranges(test_id, sex, low, high) VALUES
    ((SELECT id FROM tests WHERE code='UA'), 'M', 3.5, 7.2),
    ((SELECT id FROM tests WHERE code='UA'), 'F', 2.6, 6.0);

-- Sodium
INSERT OR IGNORE INTO test_ranges(test_id, sex, low, high) VALUES
    ((SELECT id FROM tests WHERE code='NA'), 'ANY', 135, 145);

-- Potassium
INSERT OR IGNORE INTO test_ranges(test_id, sex, low, high) VALUES
    ((SELECT id FROM tests WHERE code='K'), 'ANY', 3.5, 5.1);

-- Chloride
INSERT OR IGNORE INTO test_ranges(test_id, sex, low, high) VALUES
    ((SELECT id FROM tests WHERE code='CL'), 'ANY', 98, 107);

-- Calcium
INSERT OR IGNORE INTO test_ranges(test_id, sex, low, high) VALUES
    ((SELECT id FROM tests WHERE code='CAL'), 'ANY', 8.5, 10.5);

-- Phosphorus
INSERT OR IGNORE INTO test_ranges(test_id, sex, low, high) VALUES
    ((SELECT id FROM tests WHERE code='PHO'), 'ANY', 2.5, 4.5);

-- Magnesium
INSERT OR IGNORE INTO test_ranges(test_id, sex, low, high) VALUES
    ((SELECT id FROM tests WHERE code='MAG'), 'ANY', 1.7, 2.2);

-- Bilirubin Total
INSERT OR IGNORE INTO test_ranges(test_id, sex, low, high, range_text) VALUES
    ((SELECT id FROM tests WHERE code='BBT'), 'ANY', 0.30, 1.20, '0.30 - 1.20');

-- Bilirubin Direct
INSERT OR IGNORE INTO test_ranges(test_id, sex, high, range_text) VALUES
    ((SELECT id FROM tests WHERE code='BBD'), 'ANY', 0.30, '< 0.30');

-- Bilirubin Indirect
INSERT OR IGNORE INTO test_ranges(test_id, sex, low, high, range_text) VALUES
    ((SELECT id FROM tests WHERE code='BBI'), 'ANY', 0.00, 0.80, '0.00 - 0.80');

-- SGOT
INSERT OR IGNORE INTO test_ranges(test_id, sex, high, range_text) VALUES
    ((SELECT id FROM tests WHERE code='OT'), 'ANY', 40, '< 40');

-- SGPT
INSERT OR IGNORE INTO test_ranges(test_id, sex, high, range_text) VALUES
    ((SELECT id FROM tests WHERE code='PT_ALT'), 'ANY', 40, '< 40');

-- ALP
INSERT OR IGNORE INTO test_ranges(test_id, sex, low, high, range_text) VALUES
    ((SELECT id FROM tests WHERE code='ALP'), 'ANY', 108, 306, '108.0 - 306.0');

-- GGTP
INSERT OR IGNORE INTO test_ranges(test_id, sex, low, high, range_text) VALUES
    ((SELECT id FROM tests WHERE code='BGGT'), 'ANY', 10, 50, '10.0 - 50.00');

-- Total Protein
INSERT OR IGNORE INTO test_ranges(test_id, sex, low, high, range_text) VALUES
    ((SELECT id FROM tests WHERE code='TPN'), 'ANY', 6.4, 8.3, '6.40 - 8.30');

-- Albumin
INSERT OR IGNORE INTO test_ranges(test_id, sex, low, high, range_text) VALUES
    ((SELECT id FROM tests WHERE code='ALB'), 'ANY', 3.5, 5.2, '3.50 - 5.20');

-- Globulin
INSERT OR IGNORE INTO test_ranges(test_id, sex, low, high, range_text) VALUES
    ((SELECT id FROM tests WHERE code='GLO'), 'ANY', 1.9, 3.7, '1.9 - 3.7');

-- A/G Ratio
INSERT OR IGNORE INTO test_ranges(test_id, sex, low, high, range_text) VALUES
    ((SELECT id FROM tests WHERE code='BAG'), 'ANY', 0.9, 2.0, '0.90 - 2.00');

-- Cholesterol
INSERT OR IGNORE INTO test_ranges(test_id, sex, high, band_text) VALUES
    ((SELECT id FROM tests WHERE code='CHOL'), 'ANY', 200, 'Normal <200 / Borderline 200-239 / High ≥240');

-- Triglycerides
INSERT OR IGNORE INTO test_ranges(test_id, sex, high, band_text) VALUES
    ((SELECT id FROM tests WHERE code='TG'), 'ANY', 150, 'Normal <150 / Borderline 150-199 / High 200-499');

-- HDL
INSERT OR IGNORE INTO test_ranges(test_id, sex, low, high, band_text) VALUES
    ((SELECT id FROM tests WHERE code='BHDL'), 'ANY', 40, 60, 'Low <40 / Normal 40-60 / High >60');

-- LDL
INSERT OR IGNORE INTO test_ranges(test_id, sex, high, band_text) VALUES
    ((SELECT id FROM tests WHERE code='BLDL'), 'ANY', 130, 'Optimal <100 / Near optimal 100-129 / Borderline 130-159 / High ≥160');

-- Urine pH
INSERT OR IGNORE INTO test_ranges(test_id, sex, low, high, range_text) VALUES
    ((SELECT id FROM tests WHERE code='U_REACT'), 'ANY', 4.5, 8.0, '4.5 - 8.0');

-- Urine SG
INSERT OR IGNORE INTO test_ranges(test_id, sex, low, high, range_text) VALUES
    ((SELECT id FROM tests WHERE code='U_SG'), 'ANY', 1.010, 1.030, '1.010 - 1.030');

-- Pus Cells
INSERT OR IGNORE INTO test_ranges(test_id, sex, high, range_text) VALUES
    ((SELECT id FROM tests WHERE code='U_PUS'), 'ANY', 5, '0 - 5 /hpf');

-- ============================================================
-- Doctors
-- ============================================================
INSERT OR IGNORE INTO doctors(name) VALUES
    ('DR VARINDER MAHAJAN'),
    ('DR RAKESH SHARMA'),
    ('DR JOGINDER MAHAJAN'),
    ('DR AMIT GUPTA'),
    ('DR MOHIT MAHAJAN'),
    ('DR ASHWANI'),
    ('DR BALBIR'),
    ('DR DHANJEET'),
    ('DR JEEVAN'),
    ('DR KARANDEEP SINGH'),
    ('DR KEVAL KRISHAN'),
    ('DR LAL CHAND'),
    ('DR MOHAN'),
    ('DR MUKESH'),
    ('DR NARINDER'),
    ('DR NATHA RAM'),
    ('DR PARVEEN KUMAR'),
    ('DR PAWAN'),
    ('DR RAJ KUMAR'),
    ('AJAY'),
    ('SELF');

-- ============================================================
-- Users
-- ============================================================
INSERT OR IGNORE INTO users(username, display_name, role, password_hash, force_password_change) VALUES
    ('admin', 'Administrator', 'admin', '$argon2id$placeholder$changeme', 1);

-- ============================================================
-- Settings
-- ============================================================
INSERT OR IGNORE INTO settings(key, value) VALUES
    ('lab_name',            'SHARMA CLINICAL LABORATORY'),
    ('address_line',        'G.T. Road, Village Nangal Bhur, Teh. & Distt. Pathankot'),
    ('phones',              'Mob: 9646778583 / 9464148746'),
    ('timings',             'Summer: 7:30 am to 9:00 pm | Winter: 8:15 am to 7:30 pm'),
    ('technician_name',     'Rajesh Kumar (Vicky)'),
    ('technician_qual',     'DMLT (PTU)'),
    ('equipment_line',      'Equipped With ERBA H360 Blood Cell Counter, ERBA CHEM-5 PLUS Vz, EBRA Semi Auto Analyser, CHEM-7 & STAR 21 Semi Auto Analyser, Uri-plus 200 Urine Chemistry Analyser, Qua-lab Hba1c Analyser.'),
    ('footer_tests_line',   'T3, T4, TSH (THYROID), LH, FSH, PROLACTIN, TESTOSTERONE, ESTRADIOL, LFT, LIPID PROFILE, KIDNEY FUNCTION TEST''S CULTURES, MALARIA ANTIGEN, TYPHOID ANTIBODIES TESTS AVAILABLES'),
    ('next_test_no',        '1'),
    ('backup_retention_days','30'),
    ('whatsapp_mode',       'semi'),
    ('financial_year',      '2026-2027');

-- ============================================================
-- ============================================================
-- §5 FULL CATALOGUE COMPLETION (appended)
-- Additional tests, ranges and interpretation notes to fully
-- cover plan §5.2–§5.10. All INSERT OR IGNORE / idempotent.
-- ============================================================
-- ============================================================

-- ── HEMATOLOGY (additional) ──────────────────────────────────
INSERT OR IGNORE INTO tests(code, name, panel_id, result_type, unit, decimals, price, enabled, sort_order, needs_review) VALUES
    ('RET', 'Reticulocyte Count', (SELECT id FROM panels WHERE code='HEM'), 'numeric', '%', 1, 350, 1, 65, 1);

-- ── BIOCHEMISTRY (additional) ────────────────────────────────
INSERT OR IGNORE INTO tests(code, name, panel_id, result_type, unit, decimals, price, enabled, sort_order, needs_review) VALUES
    ('CERU', 'Ceruloplasmin', (SELECT id FROM panels WHERE code='BIO'), 'numeric', 'mg/dL', 1, 800, 1, 170, 1);

-- ── DIABETIC (additional) ────────────────────────────────────
INSERT OR IGNORE INTO tests(code, name, panel_id, result_type, unit, decimals, price, enabled, sort_order, needs_review) VALUES
    ('GTT', 'Glucose Tolerance Test', (SELECT id FROM panels WHERE code='DIAB'), 'numeric', 'mg/dL', 0, 150, 1, 60, 1);

-- ── LIPID (additional) ───────────────────────────────────────
INSERT OR IGNORE INTO tests(code, name, panel_id, result_type, unit, decimals, price, enabled, sort_order, needs_review) VALUES
    ('TL', 'Total Lipids', (SELECT id FROM panels WHERE code='LIPID'), 'numeric', 'mg/dL', 1, 200, 1, 90, 1);

-- ── HORMONES (additional) ────────────────────────────────────
INSERT OR IGNORE INTO tests(code, name, panel_id, result_type, unit, decimals, price, enabled, sort_order, needs_review) VALUES
    ('FTESTO', 'Free Testosterone', (SELECT id FROM panels WHERE code='HORM'), 'numeric', 'pg/mL', 2, 1100, 1, 55, 1);

-- ── SEROLOGY (additional) ────────────────────────────────────
INSERT OR IGNORE INTO tests(code, name, panel_id, result_type, unit, decimals, price, enabled, sort_order, choices, needs_review) VALUES
    ('WIDALT', 'Widal Test (Tube Method)',          (SELECT id FROM panels WHERE code='SERO'), 'text',    '—',     0, 800,  1, 15,  NULL, 1),
    ('ANA',    'ANA (Anti-Nuclear Antibody)',       (SELECT id FROM panels WHERE code='SERO'), 'choice',  '—',     0, 900,  1, 45,  '["Negative","Positive"]', 1),
    ('CCP',    'Anti-CCP',                          (SELECT id FROM panels WHERE code='SERO'), 'numeric', 'U/mL',  1, 1200, 1, 46,  NULL, 1),
    ('TPO',    'Anti-TPO',                          (SELECT id FROM panels WHERE code='SERO'), 'numeric', 'IU/mL', 1, 1100, 1, 47,  NULL, 1),
    ('TTG',    'Anti-Tissue Transglutaminase (IgA)',(SELECT id FROM panels WHERE code='SERO'), 'numeric', 'U/mL',  1, 850,  1, 48,  NULL, 1),
    ('HAV',    'Anti-HAV (IgM)',                    (SELECT id FROM panels WHERE code='SERO'), 'choice',  '—',     0, 500,  1, 85,  '["Non-Reactive","Reactive"]', 1),
    ('HEV',    'HEV-IgM',                           (SELECT id FROM panels WHERE code='SERO'), 'choice',  '—',     0, 1450, 1, 86,  '["Non-Reactive","Reactive"]', 1),
    ('DENG',   'Dengue IgG/IgM',                    (SELECT id FROM panels WHERE code='SERO'), 'choice',  '—',     0, 600,  1, 101, '["Negative","IgM Positive","IgG Positive","Both Positive"]', 1),
    ('MPS',    'Malaria Parasite (Slide)',          (SELECT id FROM panels WHERE code='SERO'), 'choice',  '—',     0, 50,   1, 91,  '["Negative","P.falciparum","P.vivax","Both"]', 1),
    ('CG',     'Chikungunya IgM',                   (SELECT id FROM panels WHERE code='SERO'), 'choice',  '—',     0, 400,  1, 105, '["Non-Reactive","Reactive"]', 1),
    ('SCRUB',  'Scrub Typhus IgM',                  (SELECT id FROM panels WHERE code='SERO'), 'choice',  '—',     0, 300,  1, 106, '["Non-Reactive","Reactive"]', 1),
    ('TORCH',  'TORCH Profile (IgG)',               (SELECT id FROM panels WHERE code='SERO'), 'text',    '—',     0, 1100, 1, 115, NULL, 1),
    ('TORM',   'TORCH Profile (IgM)',               (SELECT id FROM panels WHERE code='SERO'), 'text',    '—',     0, 1300, 1, 116, NULL, 1);

-- ── COAGULATION (additional) ─────────────────────────────────
INSERT OR IGNORE INTO tests(code, name, panel_id, result_type, unit, decimals, price, enabled, sort_order, formula, needs_review) VALUES
    ('INR', 'INR',        (SELECT id FROM panels WHERE code='COAG'), 'calculated', '',      2, 0,    1, 15, 'PT_PT / 12', 1),
    ('BNP', 'NT-proBNP',  (SELECT id FROM panels WHERE code='COAG'), 'numeric',    'pg/mL', 1, 1800, 1, 50, NULL, 1);

-- ============================================================
-- Test Ranges (additional, §5.2–§5.7 & §8.4/§8.5)
-- ============================================================

-- ESR (sex-specific)
INSERT OR IGNORE INTO test_ranges(test_id, sex, high, range_text) VALUES
    ((SELECT id FROM tests WHERE code='ESR'), 'M', 15, '< 15'),
    ((SELECT id FROM tests WHERE code='ESR'), 'F', 20, '< 20');

-- AEC
INSERT OR IGNORE INTO test_ranges(test_id, sex, low, high, range_text) VALUES
    ((SELECT id FROM tests WHERE code='AEC'), 'ANY', 40, 440, '40 - 440');

-- RET
INSERT OR IGNORE INTO test_ranges(test_id, sex, low, high, range_text) VALUES
    ((SELECT id FROM tests WHERE code='RET'), 'ANY', 0.5, 2.5, '0.5 - 2.5');

-- PCV / HCT (sex-specific)
INSERT OR IGNORE INTO test_ranges(test_id, sex, low, high, range_text) VALUES
    ((SELECT id FROM tests WHERE code='PCV'), 'M', 40, 50, '40 - 50'),
    ((SELECT id FROM tests WHERE code='PCV'), 'F', 36, 46, '36 - 46');

-- BT / CT
INSERT OR IGNORE INTO test_ranges(test_id, sex, low, high, range_text) VALUES
    ((SELECT id FROM tests WHERE code='BT'), 'ANY', 2, 7, '2 - 7'),
    ((SELECT id FROM tests WHERE code='CT'), 'ANY', 4, 9, '4 - 9');

-- ── CBC sub-parameters (ERBA H360 reference, §8.4) ───────────
INSERT OR IGNORE INTO test_ranges(test_id, sex, low, high, range_text) VALUES
    ((SELECT id FROM tests WHERE code='WBC'),     'ANY', 4.0,  10.0,  '4.0 - 10.0'),
    ((SELECT id FROM tests WHERE code='LYM_PCT'), 'ANY', 20.0, 40.0,  '20.0 - 40.0'),
    ((SELECT id FROM tests WHERE code='MID_PCT'), 'ANY', 3.0,  9.0,   '3.0 - 9.0'),
    ((SELECT id FROM tests WHERE code='GRAN_PCT'),'ANY', 50.0, 70.0,  '50.0 - 70.0'),
    ((SELECT id FROM tests WHERE code='LYM_NUM'), 'ANY', 0.8,  4.0,   '0.8 - 4.0'),
    ((SELECT id FROM tests WHERE code='MID_NUM'), 'ANY', 0.1,  1.5,   '0.1 - 1.5'),
    ((SELECT id FROM tests WHERE code='GRAN_NUM'),'ANY', 2.0,  7.0,   '2.0 - 7.0'),
    ((SELECT id FROM tests WHERE code='RBC_CNT'), 'ANY', 4.0,  6.0,   '4.0 - 6.0'),
    ((SELECT id FROM tests WHERE code='HGB'),     'ANY', 12.0, 17.5,  '12.0 - 17.5'),
    ((SELECT id FROM tests WHERE code='HCT'),     'ANY', 36.0, 50.0,  '36.0 - 50.0'),
    ((SELECT id FROM tests WHERE code='MCV'),     'ANY', 80.0, 100.0, '80.0 - 100.0'),
    ((SELECT id FROM tests WHERE code='MCH'),     'ANY', 27.0, 32.0,  '27.0 - 32.0'),
    ((SELECT id FROM tests WHERE code='MCHC'),    'ANY', 32.0, 36.0,  '32.0 - 36.0'),
    ((SELECT id FROM tests WHERE code='RDW_SD'),  'ANY', 35.0, 56.0,  '35.0 - 56.0'),
    ((SELECT id FROM tests WHERE code='RDW_CV'),  'ANY', 11.0, 16.0,  '11.0 - 16.0'),
    ((SELECT id FROM tests WHERE code='PLT_CBC'), 'ANY', 150,  450,   '150 - 450'),
    ((SELECT id FROM tests WHERE code='MPV'),     'ANY', 7.0,  11.0,  '7.0 - 11.0'),
    ((SELECT id FROM tests WHERE code='PCT_CBC'), 'ANY', 0.108,0.282, '0.108 - 0.282'),
    ((SELECT id FROM tests WHERE code='PDW_SD'),  'ANY', 9.0,  17.0,  '9.0 - 17.0'),
    ((SELECT id FROM tests WHERE code='PDW_CV'),  'ANY', 10.0, 18.0,  '10.0 - 18.0'),
    ((SELECT id FROM tests WHERE code='PLCR'),    'ANY', 13.0, 43.0,  '13.0 - 43.0'),
    ((SELECT id FROM tests WHERE code='PLCC'),    'ANY', 30,   90,    '30 - 90');

-- ── DIABETIC ─────────────────────────────────────────────────
-- HbA1c (multi-band; primary normal band <5.7)
INSERT OR IGNORE INTO test_ranges(test_id, sex, high, band_text) VALUES
    ((SELECT id FROM tests WHERE code='HBA1C'), 'ANY', 5.7, 'Non-diabetic <5.7 / Pre-diabetic 5.7-6.4 / Diabetic >=6.5');
-- EAG (derived; no fixed range, descriptive)
INSERT OR IGNORE INTO test_ranges(test_id, sex, band_text) VALUES
    ((SELECT id FROM tests WHERE code='EAG'), 'ANY', 'Estimated Average Glucose = 28.7 x HbA1c - 46.7');

-- ── KIDNEY / ELECTROLYTES (additional) ───────────────────────
INSERT OR IGNORE INTO test_ranges(test_id, sex, low, high, range_text) VALUES
    ((SELECT id FROM tests WHERE code='BCALI'), 'ANY', 4.5, 5.6, '4.5 - 5.6'),
    ((SELECT id FROM tests WHERE code='LIT'),   'ANY', 0.6, 1.2, '0.6 - 1.2'),
    ((SELECT id FROM tests WHERE code='BC'),    'ANY', 22,  29,  '22 - 29');
INSERT OR IGNORE INTO test_ranges(test_id, sex, high, range_text) VALUES
    ((SELECT id FROM tests WHERE code='MAU'), 'ANY', 30, '< 30');
INSERT OR IGNORE INTO test_ranges(test_id, sex, low, range_text) VALUES
    ((SELECT id FROM tests WHERE code='GFR'), 'ANY', 90, '> 90');

-- ── LFT (GGTP already; nothing missing) ──────────────────────
-- (BBT/BBD/BBI/OT/PT_ALT/ALP/BGGT/TPN/ALB/GLO/BAG ranges already seeded)

-- ── LIPID (additional) ───────────────────────────────────────
INSERT OR IGNORE INTO test_ranges(test_id, sex, low, high, range_text) VALUES
    ((SELECT id FROM tests WHERE code='BVLDL'), 'ANY', 12, 30, '12 - 30'),
    ((SELECT id FROM tests WHERE code='TL'),    'ANY', 400, 700, '400 - 700');
INSERT OR IGNORE INTO test_ranges(test_id, sex, low, high, range_text) VALUES
    ((SELECT id FROM tests WHERE code='BRAT'), 'ANY', 0, 4.8, '0 - 4.8'),
    ((SELECT id FROM tests WHERE code='BLHR'), 'ANY', 0, 3.5, '0 - 3.5');
INSERT OR IGNORE INTO test_ranges(test_id, sex, high, range_text) VALUES
    ((SELECT id FROM tests WHERE code='NHDL'), 'ANY', 130, '< 130');

-- ── CARDIAC / ENZYMES / IRON (BIO) ───────────────────────────
INSERT OR IGNORE INTO test_ranges(test_id, sex, high, range_text) VALUES
    ((SELECT id FROM tests WHERE code='CPKM'),  'ANY', 25,  '< 25'),
    ((SELECT id FROM tests WHERE code='HSCRP'), 'ANY', 3.0, '< 3.0');
INSERT OR IGNORE INTO test_ranges(test_id, sex, low, high, range_text) VALUES
    ((SELECT id FROM tests WHERE code='CPKN'), 'ANY', 24,  195, '24 - 195'),
    ((SELECT id FROM tests WHERE code='LDH1'), 'ANY', 140, 280, '140 - 280'),
    ((SELECT id FROM tests WHERE code='ACP'),  'ANY', 0,   6.5, '0 - 6.5'),
    ((SELECT id FROM tests WHERE code='LPA'),  'ANY', 13,  60,  '13 - 60'),
    ((SELECT id FROM tests WHERE code='AMY'),  'ANY', 25,  125, '25 - 125'),
    ((SELECT id FROM tests WHERE code='FOL'),  'ANY', 3.0, 17.0,'3.0 - 17.0'),
    ((SELECT id FROM tests WHERE code='VTB'),  'ANY', 200, 900, '200 - 900'),
    ((SELECT id FROM tests WHERE code='VITD'), 'ANY', 30,  100, '30 - 100'),
    ((SELECT id FROM tests WHERE code='AMM'),  'ANY', 15,  45,  '15 - 45'),
    ((SELECT id FROM tests WHERE code='G6QT'), 'ANY', 6.4, 18.7,'6.4 - 18.7'),
    ((SELECT id FROM tests WHERE code='CERU'), 'ANY', 20,  60,  '20 - 60');
INSERT OR IGNORE INTO test_ranges(test_id, sex, low, high, range_text) VALUES
    ((SELECT id FROM tests WHERE code='IRON'), 'M', 65, 175, '65 - 175'),
    ((SELECT id FROM tests WHERE code='IRON'), 'F', 50, 170, '50 - 170'),
    ((SELECT id FROM tests WHERE code='TIBC'), 'ANY', 250, 450, '250 - 450'),
    ((SELECT id FROM tests WHERE code='FER'),  'M', 22, 322, '22 - 322'),
    ((SELECT id FROM tests WHERE code='FER'),  'F', 10, 291, '10 - 291');

-- ── THYROID ──────────────────────────────────────────────────
INSERT OR IGNORE INTO test_ranges(test_id, sex, low, high, range_text) VALUES
    ((SELECT id FROM tests WHERE code='TSH'), 'ANY', 0.27, 4.20, '0.27 - 4.20'),
    ((SELECT id FROM tests WHERE code='T3'),  'ANY', 80,   200,  '80 - 200'),
    ((SELECT id FROM tests WHERE code='T4'),  'ANY', 5.1,  14.1, '5.1 - 14.1'),
    ((SELECT id FROM tests WHERE code='FT3'), 'ANY', 2.0,  4.4,  '2.0 - 4.4'),
    ((SELECT id FROM tests WHERE code='FT4'), 'ANY', 0.93, 1.71, '0.93 - 1.71');

-- ── HORMONES ─────────────────────────────────────────────────
INSERT OR IGNORE INTO test_ranges(test_id, sex, low, high, range_text) VALUES
    ((SELECT id FROM tests WHERE code='PRL'),    'ANY', 4.0,  15.2, '4.0 - 15.2'),
    ((SELECT id FROM tests WHERE code='DHEA'),   'ANY', 35,   430,  '35 - 430'),
    ((SELECT id FROM tests WHERE code='INS'),    'ANY', 2.6,  24.9, '2.6 - 24.9'),
    ((SELECT id FROM tests WHERE code='HGH'),    'ANY', 0,    10,   '< 10'),
    ((SELECT id FROM tests WHERE code='PTH'),    'ANY', 15,   65,   '15 - 65'),
    ((SELECT id FROM tests WHERE code='CORT'),   'ANY', 6.2,  19.4, '6.2 - 19.4 (morning)'),
    ((SELECT id FROM tests WHERE code='FTESTO'), 'ANY', 8.7,  54.7, '8.7 - 54.7');
INSERT OR IGNORE INTO test_ranges(test_id, sex, low, high, range_text) VALUES
    ((SELECT id FROM tests WHERE code='LH'),    'M', 1.7, 8.6,  '1.7 - 8.6'),
    ((SELECT id FROM tests WHERE code='LH'),    'F', 2.4, 12.6, '2.4 - 12.6 (follicular)'),
    ((SELECT id FROM tests WHERE code='FSH'),   'M', 1.5, 12.4, '1.5 - 12.4'),
    ((SELECT id FROM tests WHERE code='FSH'),   'F', 3.5, 12.5, '3.5 - 12.5 (follicular)'),
    ((SELECT id FROM tests WHERE code='TESTO'), 'M', 280, 1100, '280 - 1100'),
    ((SELECT id FROM tests WHERE code='TESTO'), 'F', 15,  70,   '15 - 70'),
    ((SELECT id FROM tests WHERE code='E2'),    'M', 11,  44,   '11 - 44'),
    ((SELECT id FROM tests WHERE code='E2'),    'F', 30,  400,  '30 - 400 (cycle dependent)'),
    ((SELECT id FROM tests WHERE code='PROG'),  'F', 0.2, 25,   '0.2 - 25 (cycle dependent)'),
    ((SELECT id FROM tests WHERE code='AMH'),   'F', 1.0, 6.8,  '1.0 - 6.8');
INSERT OR IGNORE INTO test_ranges(test_id, sex, high, range_text) VALUES
    ((SELECT id FROM tests WHERE code='INSPP'), 'ANY', 100, '< 100'),
    ((SELECT id FROM tests WHERE code='BETA'),  'ANY', 5,   '< 5 (non-pregnant)');

-- ── SEROLOGY (numeric markers) ───────────────────────────────
INSERT OR IGNORE INTO test_ranges(test_id, sex, high, range_text) VALUES
    ((SELECT id FROM tests WHERE code='CRP'),   'ANY', 6,   '< 6'),
    ((SELECT id FROM tests WHERE code='ASO'),   'ANY', 200, '< 200'),
    ((SELECT id FROM tests WHERE code='RA'),    'ANY', 20,  '< 20'),
    ((SELECT id FROM tests WHERE code='CCP'),   'ANY', 17,  '< 17'),
    ((SELECT id FROM tests WHERE code='TPO'),   'ANY', 34,  '< 34'),
    ((SELECT id FROM tests WHERE code='TTG'),   'ANY', 10,  '< 10'),
    ((SELECT id FROM tests WHERE code='CEA'),   'ANY', 5.0, '< 5.0'),
    ((SELECT id FROM tests WHERE code='AFP'),   'ANY', 10,  '< 10'),
    ((SELECT id FROM tests WHERE code='CA125'), 'ANY', 35,  '< 35'),
    ((SELECT id FROM tests WHERE code='CA199'), 'ANY', 37,  '< 37'),
    ((SELECT id FROM tests WHERE code='CA153'), 'ANY', 31.3,'< 31.3');
INSERT OR IGNORE INTO test_ranges(test_id, sex, high, range_text) VALUES
    ((SELECT id FROM tests WHERE code='PSA'), 'M', 4.0, '< 4.0');

-- ── COAGULATION ──────────────────────────────────────────────
INSERT OR IGNORE INTO test_ranges(test_id, sex, low, high, range_text) VALUES
    ((SELECT id FROM tests WHERE code='PT_PT'), 'ANY', 11, 13.5, '11 - 13.5'),
    ((SELECT id FROM tests WHERE code='INR'),   'ANY', 0.8, 1.2, '0.8 - 1.2'),
    ((SELECT id FROM tests WHERE code='APTT'),  'ANY', 26, 36,   '26 - 36');
INSERT OR IGNORE INTO test_ranges(test_id, sex, high, range_text) VALUES
    ((SELECT id FROM tests WHERE code='DDIMER'), 'ANY', 0.5, '< 0.5'),
    ((SELECT id FROM tests WHERE code='BNP'),    'ANY', 125, '< 125');

-- ============================================================
-- Interpretation Notes (§5.10) — attach to lead tests
-- (a)/(b) verbatim; (c)-(h) authored standards
-- ============================================================

-- (a) Glucose -> FBS (VERBATIM)
UPDATE tests SET interpretation_note =
'Interpretation (in accordance with the American diabetes association guidelines):
A fasting plasma glucose level below 110 mg/dL is considered normal.
A fasting plasma glucose level between 110-126 mg/dL is considered as glucose intolerant or pre diabetic. A fasting and post-prandial blood sugar test (after consumption of 75 gm of glucose) is recommended for all such patients.
A fasting plasma glucose level of above 126 mg/dL is highly suggestive of a diabetic state. A repeat fasting test is strongly recommended for all such patients. A fasting plasma glucose level in excess of 126 mg/dL on two different occasions is confirmatory of a diabetic state.'
WHERE code='FBS';

-- (b) HbA1c -> HBA1C (VERBATIM REMARKS)
UPDATE tests SET interpretation_note =
'Bands: 4.0-5.6 Non-diabetic | 5.7-6.3 Prediabetic | 6.3-7.0 Good control | 7.0-8.0 Fair control | >8.0 Poor control.
REMARKS: In vitro quantitative determination of HbA1c in whole blood is utilized in long term monitoring of glycemia. The HbA1c level correlates with the mean glucose concentration prevailing in the course of the patient''s recent history (approx. 6-8 weeks) and therefore provides much more reliable information for glycemia monitoring than do determinations of blood glucose or urinary glucose. It is recommended that the determination of HbA1c be performed at intervals of 4-6 weeks during Diabetes Mellitus therapy. Results of HbA1c should be assessed in conjunction with the patient''s medical history, clinical examinations and other findings.'
WHERE code='HBA1C';

-- (c) Lipid -> CHOL (authored)
UPDATE tests SET interpretation_note =
'Total Cholesterol: Desirable < 200 / Borderline high 200-239 / High >= 240 mg/dL.
LDL Cholesterol: Optimal < 100 / Near optimal 100-129 / Borderline high 130-159 / High 160-189 / Very high >= 190 mg/dL.
HDL Cholesterol: Low (risk) < 40 / High (protective) >= 60 mg/dL.
Triglycerides: Normal < 150 / Borderline high 150-199 / High 200-499 / Very high >= 500 mg/dL.
A higher Total Cholesterol/HDL ratio indicates greater cardiovascular risk. Results should be interpreted with the patient''s overall risk factors.'
WHERE code='CHOL';

-- (d) Thyroid -> TSH (authored)
UPDATE tests SET interpretation_note =
'T3, T4 and TSH together assess thyroid function. A high TSH with low T4 suggests primary hypothyroidism; a low TSH with high T3/T4 suggests hyperthyroidism. Mild TSH elevation with normal T4 suggests subclinical hypothyroidism. Correlate clinically; TSH varies with age, pregnancy, and medication.'
WHERE code='TSH';

-- (e) LFT -> OT (authored)
UPDATE tests SET interpretation_note =
'Raised SGOT/SGPT indicate hepatocellular injury; a raised Alkaline Phosphatase/GGT pattern suggests cholestasis. Raised bilirubin with normal enzymes may indicate haemolysis or Gilbert''s syndrome. Low albumin or reversed A:G ratio may reflect chronic liver disease. Interpret together with clinical findings.'
WHERE code='OT';

-- (f) KFT/RFT -> UREA (authored)
UPDATE tests SET interpretation_note =
'Raised Urea and Creatinine with reduced eGFR indicate impaired renal function. Electrolyte (Na/K) disturbances require urgent correlation. A single abnormal value should be confirmed and interpreted with hydration status and clinical context.'
WHERE code='UREA';

-- (g) Widal -> WIDAL (authored)
UPDATE tests SET interpretation_note =
'Titres >= 1:160 for O and H antigens are generally significant for enteric fever in a non-vaccinated patient; a four-fold rise in paired samples is confirmatory. Correlate with clinical features; a single titre may reflect past infection or vaccination.'
WHERE code='WIDAL';

-- (h) CBC -> WBC (authored)
UPDATE tests SET interpretation_note =
'Results are generated on a 3-part differential cell counter (ERBA H360). Abnormal flags should be confirmed on a peripheral blood film where clinically indicated.'
WHERE code='WBC';

-- ============================================================
-- Mark migration applied
-- ============================================================
INSERT OR IGNORE INTO schema_migrations(version) VALUES('0002');
