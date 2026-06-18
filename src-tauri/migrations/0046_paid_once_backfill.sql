-- Free-trial support: distinguish a lab that has EVER paid (renewal price ₹1000) from a brand-new
-- or trial-only lab (first-year price ₹5000). Going forward, activateLicense() sets paid_once='1'
-- on a paid activation. Here we backfill it for EXISTING already-set-up installs (which, before the
-- trial feature existed, could only have reached "setup done" by paying) so their renewal pricing is
-- unchanged. A fresh install runs this before setup_done exists, so trial users are NOT marked paid.
INSERT OR IGNORE INTO settings(key, value)
SELECT 'paid_once', '1'
WHERE EXISTS (SELECT 1 FROM settings WHERE key = 'setup_done' AND value = '1');
