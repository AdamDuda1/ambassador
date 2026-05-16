CREATE TABLE IF NOT EXISTS user_feature_flag_overrides (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  flag_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  PRIMARY KEY (user_id, flag_key)
);

CREATE INDEX IF NOT EXISTS user_feature_flag_overrides_flag_key_idx
  ON user_feature_flag_overrides (flag_key);

INSERT INTO user_feature_flag_overrides (user_id, flag_key)
SELECT id, 'posters_enabled'
FROM users
WHERE posters_enabled = TRUE
ON CONFLICT DO NOTHING;

ALTER TABLE users DROP COLUMN IF EXISTS posters_enabled;
