-- 0033_footer_settings: add editable footer lines for the report bottom bar
INSERT OR IGNORE INTO settings(key, value) VALUES
  ('footer_left_text',  'NOT FOR MEDICO LEGAL PURPOSE'),
  ('footer_right_text', 'ALL TEST ARE AVAILABLE HERE');

INSERT OR IGNORE INTO schema_migrations(version) VALUES('0033');
