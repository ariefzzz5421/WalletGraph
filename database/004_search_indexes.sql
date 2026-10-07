CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS wallets_name_search_idx ON wallets USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS wallets_address_search_idx ON wallets USING gin(address gin_trgm_ops);
CREATE INDEX IF NOT EXISTS entities_name_search_idx ON entities USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS tags_name_search_idx ON tags USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS events_token_address_search_idx ON wallet_events USING gin(token_address gin_trgm_ops) WHERE token_address IS NOT NULL;
CREATE INDEX IF NOT EXISTS events_token_symbol_search_idx ON wallet_events USING gin(token_symbol gin_trgm_ops) WHERE token_symbol IS NOT NULL;
CREATE INDEX IF NOT EXISTS events_hash_search_idx ON wallet_events USING gin(tx_hash gin_trgm_ops);
