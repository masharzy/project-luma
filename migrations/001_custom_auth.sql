CREATE SCHEMA IF NOT EXISTS app_auth;
CREATE TABLE IF NOT EXISTS app_auth.users (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 email text NOT NULL UNIQUE CHECK (email=lower(email) AND length(email)<=254),
 name text NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
 password_hash text,
 email_verified boolean NOT NULL DEFAULT false,
 role text NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
 banned boolean NOT NULL DEFAULT false,
 session_version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS app_auth.identities (
 provider text NOT NULL CHECK(provider='google'), subject text NOT NULL,
 user_id uuid NOT NULL REFERENCES app_auth.users(id) ON DELETE CASCADE,
 PRIMARY KEY(provider,subject), UNIQUE(user_id,provider)
);
CREATE TABLE IF NOT EXISTS app_auth.sessions (
 token_hash text PRIMARY KEY CHECK(length(token_hash)=64),
 user_id uuid NOT NULL REFERENCES app_auth.users(id) ON DELETE CASCADE,
 session_version integer NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 last_seen_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS auth_sessions_user ON app_auth.sessions(user_id);
CREATE INDEX IF NOT EXISTS auth_sessions_expiry ON app_auth.sessions(expires_at);
CREATE TABLE IF NOT EXISTS app_auth.email_tokens (
 token_hash text PRIMARY KEY CHECK(length(token_hash)=64),
 user_id uuid NOT NULL REFERENCES app_auth.users(id) ON DELETE CASCADE,
 kind text NOT NULL CHECK(kind IN('verify_email','reset_password')),
 created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS auth_email_tokens_user ON app_auth.email_tokens(user_id);
CREATE TABLE IF NOT EXISTS app_auth.rate_limits (
 key_hash text NOT NULL, window_start bigint NOT NULL,
 count integer NOT NULL DEFAULT 1,
 expires_at timestamptz NOT NULL,
 PRIMARY KEY(key_hash,window_start)
);
CREATE INDEX IF NOT EXISTS auth_rate_expiry ON app_auth.rate_limits(expires_at);
CREATE TABLE IF NOT EXISTS app_auth.oauth_flows (
 state_hash text PRIMARY KEY CHECK(length(state_hash)=64),
 verifier text NOT NULL, nonce text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS app_auth.audit_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 user_id uuid REFERENCES app_auth.users(id) ON DELETE SET NULL,
 action text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auth_audit_user ON app_auth.audit_events(user_id,created_at);
