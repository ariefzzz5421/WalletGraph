CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin','member')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);
CREATE TABLE IF NOT EXISTS auth_attempts (
  key text PRIMARY KEY,
  attempts integer NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS api_rate_limits (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  requests integer NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chain text NOT NULL,
  chain_type text NOT NULL CHECK (chain_type IN ('evm','solana')),
  address text NOT NULL,
  name text NOT NULL,
  category text,
  entity_name text,
  notes text,
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high')),
  alert_level text NOT NULL DEFAULT 'all' CHECK (alert_level IN ('off','all')),
  sync_status text NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending','syncing','ready','unavailable','error')),
  sync_error text,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id,chain,address)
);
CREATE INDEX IF NOT EXISTS wallets_user_idx ON wallets(user_id,created_at DESC);
CREATE TABLE IF NOT EXISTS tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id,name)
);
CREATE TABLE IF NOT EXISTS wallet_tags (
  wallet_id uuid NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (wallet_id,tag_id)
);
CREATE TABLE IF NOT EXISTS wallet_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wallet_id uuid NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  event_key text NOT NULL,
  chain text NOT NULL,
  tx_hash text NOT NULL,
  event_index text NOT NULL,
  event_type text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('in','out','self','unknown')),
  from_address text,
  to_address text,
  token_symbol text,
  token_address text,
  amount numeric,
  usd_value numeric,
  occurred_at timestamptz NOT NULL,
  source text NOT NULL,
  raw jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (wallet_id,event_key)
);
CREATE INDEX IF NOT EXISTS events_user_time_idx ON wallet_events(user_id,occurred_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS events_wallet_time_idx ON wallet_events(wallet_id,occurred_at DESC,id DESC);
CREATE TABLE IF NOT EXISTS sync_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  mode text NOT NULL DEFAULT 'latest' CHECK (mode IN ('latest','7d','30d','90d','full')),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','done','failed')),
  processed integer NOT NULL DEFAULT 0,
  error text,
  attempts integer NOT NULL DEFAULT 0,
  run_after timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS jobs_claim_idx ON sync_jobs(status,run_after,created_at);
CREATE UNIQUE INDEX IF NOT EXISTS one_active_sync_per_wallet ON sync_jobs(wallet_id) WHERE status IN ('queued','running');
CREATE TABLE IF NOT EXISTS discord_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  guild_id text UNIQUE,
  guild_name text,
  channel_id text,
  channel_name text,
  pairing_hash text,
  pairing_expires_at timestamptz,
  connected_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS discord_user_idx ON discord_connections(user_id);
CREATE TABLE IF NOT EXISTS alert_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  wallet_id uuid REFERENCES wallets(id) ON DELETE CASCADE,
  event_type text,
  direction text,
  chain text,
  token_symbol text,
  min_usd numeric,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS alert_rules_user_idx ON alert_rules(user_id,enabled);
CREATE TABLE IF NOT EXISTS alert_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id uuid NOT NULL REFERENCES alert_rules(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES wallet_events(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (rule_id,event_id)
);
CREATE TABLE IF NOT EXISTS discord_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_event_id uuid NOT NULL REFERENCES alert_events(id) ON DELETE CASCADE,
  connection_id uuid NOT NULL REFERENCES discord_connections(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sending','sent','failed')),
  attempts integer NOT NULL DEFAULT 0,
  error text,
  claimed_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (alert_event_id,connection_id)
);
CREATE INDEX IF NOT EXISTS discord_delivery_idx ON discord_deliveries(status,created_at);
CREATE TABLE IF NOT EXISTS provider_health (
  provider text NOT NULL,
  chain text NOT NULL,
  status text NOT NULL,
  latency_ms integer,
  request_count bigint NOT NULL DEFAULT 0,
  error_count bigint NOT NULL DEFAULT 0,
  last_error text,
  last_checked_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (provider,chain)
);
CREATE TABLE IF NOT EXISTS audit_log (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text,
  target_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
