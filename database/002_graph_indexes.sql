CREATE INDEX IF NOT EXISTS events_from_graph_idx ON wallet_events(user_id,chain,from_address,occurred_at DESC) WHERE from_address IS NOT NULL;
CREATE INDEX IF NOT EXISTS events_to_graph_idx ON wallet_events(user_id,chain,to_address,occurred_at DESC) WHERE to_address IS NOT NULL;
CREATE INDEX IF NOT EXISTS events_from_graph_evm_idx ON wallet_events(user_id,chain,lower(from_address),occurred_at DESC) WHERE from_address IS NOT NULL;
CREATE INDEX IF NOT EXISTS events_to_graph_evm_idx ON wallet_events(user_id,chain,lower(to_address),occurred_at DESC) WHERE to_address IS NOT NULL;
CREATE INDEX IF NOT EXISTS events_chain_type_idx ON wallet_events(user_id,chain,event_type,occurred_at DESC);
