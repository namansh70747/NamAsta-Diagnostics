-- ============================================================
-- Migration 0015 : Sharma Clinical Laboratory's full referring-doctor list
-- ============================================================
-- These are SHARMA's own referring doctors (from the lab's existing software). They must
-- ONLY exist on the Sharma install — every NEW customer lab builds its own doctor list.
-- Guard: only seed when this DB already has patients (= the in-use Sharma install). A fresh
-- new-customer install has no patients, so this inserts nothing; and completeSetup() clears
-- the generic seed doctors for new labs anyway. INSERT OR IGNORE skips any already present.

INSERT OR IGNORE INTO doctors(name)
SELECT column1 FROM (VALUES
    ('DR RAKESH SHARMA'),
    ('DR RAMAN'),
    ('DR RAMAN LIPID'),
    ('DR RAVI KUMAR'),
    ('DR S. BHAGAT'),
    ('DR S.S MANHAS'),
    ('DR SACHIN MEHTA'),
    ('DR SHIV KARAN DEV'),
    ('DR SHIVKARAN DEV'),
    ('DR SOM NATH'),
    ('DR SUDESH'),
    ('DR SURINDER'),
    ('DR VARINDER MAHAJAN'),
    ('DR VIJAY BUDHWAR DM ENDOCRINOLOGIST'),
    ('DR VINOD'),
    ('DR Y.R.RAJWAL'),
    ('DR AMIT GUPTA DM CARDIOLOGY'),
    ('DR ASHWANI'),
    ('DR BALBIR'),
    ('DR CHARANJEET'),
    ('DR JEEVAN'),
    ('DR KARANDEEP SINGH'),
    ('DR KEWAL KRISHAN'),
    ('DR LAL CHAND'),
    ('DR MIR CHAND'),
    ('DR MOHAN'),
    ('DR MOHIT MAHAJAN DM NEPHROLOGY'),
    ('DR MUKESH'),
    ('DR NARINDER'),
    ('DR NATHA RAM'),
    ('DR PARVEEN KUMAR'),
    ('DR PAWAN'),
    ('DR R.K.BHAGAT'),
    ('DR RAJU SAINI'),
    ('MADAN LAL'),
    ('MANOJ'),
    ('AJAY'),
    ('SELF')
)
WHERE (SELECT COUNT(*) FROM patients) > 0;

INSERT OR IGNORE INTO schema_migrations(version) VALUES('0015');
