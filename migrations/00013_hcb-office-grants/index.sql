CREATE TABLE IF NOT EXISTS hcb_oauth_credentials (
  id TEXT PRIMARY KEY,
  authorized_hcb_user_id TEXT,
  authorized_hcb_user_name TEXT,
  authorized_hcb_user_email TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_type TEXT,
  scopes TEXT,
  expires_at TIMESTAMPTZ,
  last_refreshed_at TIMESTAMPTZ,
  last_error TEXT,
  authorized_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_hcb_grants (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  grant_id TEXT,
  organization_id TEXT,
  provisioning_state TEXT NOT NULL DEFAULT 'pending',
  provisioning_source TEXT,
  purpose TEXT NOT NULL DEFAULT 'Office Expenses',
  amount_cents INTEGER NOT NULL DEFAULT 2000,
  balance_cents INTEGER,
  balance_synced_at TIMESTAMPTZ,
  linked_at TIMESTAMPTZ,
  linked_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  last_attempted_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS user_hcb_grants_grant_id_unique
  ON user_hcb_grants (grant_id)
  WHERE grant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS user_hcb_grants_state_retry_idx
  ON user_hcb_grants (provisioning_state, next_retry_at, created_at);
