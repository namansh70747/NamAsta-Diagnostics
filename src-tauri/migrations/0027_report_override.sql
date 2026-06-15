-- ============================================================
-- Migration 0027 : editable report — per-patient HTML override
-- ============================================================
-- When the user edits a report in-app (like a document), the edited HTML is saved here. If a
-- row exists for a patient, the report screen shows/prints/sends THIS edited version instead of
-- the auto-generated one. "Revert to original" deletes the row and the generated report returns.

CREATE TABLE IF NOT EXISTS report_overrides (
  patient_id INTEGER PRIMARY KEY REFERENCES patients(id) ON DELETE CASCADE,
  html       TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO schema_migrations(version) VALUES('0027');
