-- Shared rate limits for public forms and admin sign-in (lib/security.ts). Run once; safe to re-run.
-- Until this table exists each server instance keeps its own limits in memory, as before.
-- key is a SHA-256 hash of e.g. "contact:<ip>", so client IPs are not stored.
CREATE TABLE IF NOT EXISTS bakery_rate_limits (
 key text PRIMARY KEY,
 count integer NOT NULL,
 reset_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS bakery_rate_limits_reset_at ON bakery_rate_limits (reset_at);

-- No browser policies: only the trusted server database connection can access these records.
ALTER TABLE bakery_rate_limits ENABLE ROW LEVEL SECURITY;
