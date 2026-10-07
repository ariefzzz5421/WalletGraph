ALTER TABLE wallets ADD CONSTRAINT wallets_id_user_unique UNIQUE (id,user_id);
CREATE TABLE IF NOT EXISTS entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id,name),
  UNIQUE (id,user_id)
);
CREATE INDEX IF NOT EXISTS entities_user_idx ON entities(user_id,created_at DESC);
CREATE TABLE IF NOT EXISTS entity_wallets (
  user_id uuid NOT NULL,
  entity_id uuid NOT NULL,
  wallet_id uuid NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (entity_id,wallet_id),
  FOREIGN KEY (entity_id,user_id) REFERENCES entities(id,user_id) ON DELETE CASCADE,
  FOREIGN KEY (wallet_id,user_id) REFERENCES wallets(id,user_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS entity_wallets_user_idx ON entity_wallets(user_id,entity_id);
