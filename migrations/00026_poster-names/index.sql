ALTER TABLE posters
ADD COLUMN IF NOT EXISTS name TEXT;

UPDATE posters
SET name = LEFT(NULLIF(BTRIM(metadata->>'name'), ''), 80)
WHERE name IS NULL
  AND jsonb_typeof(metadata->'name') = 'string';

UPDATE posters
SET name = NULL
WHERE name IS NOT NULL
  AND BTRIM(name) = '';

ALTER TABLE posters
DROP CONSTRAINT IF EXISTS posters_name_check;

ALTER TABLE posters
ADD CONSTRAINT posters_name_check
CHECK (name IS NULL OR char_length(BTRIM(name)) BETWEEN 1 AND 80);
