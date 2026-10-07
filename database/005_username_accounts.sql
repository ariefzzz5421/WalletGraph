ALTER TABLE users ADD COLUMN IF NOT EXISTS username text;
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
ALTER TABLE users ADD CONSTRAINT users_identity_required CHECK (username IS NOT NULL OR email IS NOT NULL);
ALTER TABLE users ADD CONSTRAINT users_username_format CHECK (username IS NULL OR username ~ '^[A-Za-z][A-Za-z0-9_]{2,29}$');
CREATE UNIQUE INDEX IF NOT EXISTS users_username_ci_unique ON users(lower(username)) WHERE username IS NOT NULL;
