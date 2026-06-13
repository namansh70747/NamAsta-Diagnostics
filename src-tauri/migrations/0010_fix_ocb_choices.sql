-- The seed (0002) inserted OCB ('Occult Blood') twice; the first row (no `choices`)
-- won the INSERT OR IGNORE on the unique code, so the intended Negative/Positive
-- dropdown values were dropped and the field rendered as an empty selector.
-- Fix forward: set the choices on the existing row (never edit an applied migration).
UPDATE tests SET choices = '["Negative","Positive"]'
WHERE code = 'OCB' AND (choices IS NULL OR TRIM(choices) = '');
