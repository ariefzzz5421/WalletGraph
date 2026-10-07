-- One internal owner preserves the existing user-scoped tables without a public account flow.
INSERT INTO users (id, username, password_hash, role)
VALUES ('7d6c4f0d-c71a-4eee-9c3f-783f8fb36477', 'wg_site_workspace', 'disabled', 'admin')
ON CONFLICT DO NOTHING;
