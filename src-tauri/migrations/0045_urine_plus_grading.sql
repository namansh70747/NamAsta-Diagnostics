-- Urine semi-quantitative dropdowns (Protein/Glucose/Ketone/Blood, etc.) used the bare symbols
-- +, ++, +++. Switch to the standard grading 1+, 2+, 3+ so the choices read:
--   Nil, Trace, 1+, 2+, 3+, Positive, Negative
-- Only the selectable options change; previously-entered/printed results are left untouched.
UPDATE tests
   SET choices = REPLACE(choices, '"+","++","+++"', '"1+","2+","3+"')
 WHERE choices LIKE '%"+","++","+++"%';
