-- AI notes for custom cake inquiries (lib/inquiry-assistant-server.ts) and small admin settings. Run once after 009;
-- safe to re-run. Until this exists inquiries work as before, just without AI notes.

-- One row per inquiry; a new run replaces it. payload is encrypted by the server (lib/storage-crypto.ts).
-- model, prompt_version, tokens and latency are kept in the clear for monitoring cost and speed.
CREATE TABLE IF NOT EXISTS bakery_cake_inquiry_notes (
 inquiry_id uuid PRIMARY KEY,
 payload text NOT NULL,
 model text NOT NULL,
 prompt_version text NOT NULL,
 input_tokens integer NOT NULL DEFAULT 0,
 output_tokens integer NOT NULL DEFAULT 0,
 latency_ms integer NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now()
);

-- Admin settings edited in admin → Settings, e.g. reply_signer (the name that signs reply drafts).
CREATE TABLE IF NOT EXISTS bakery_settings (
 key text PRIMARY KEY,
 value text NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);

-- No browser policies: only the trusted server database connection can access these records.
ALTER TABLE bakery_cake_inquiry_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bakery_settings ENABLE ROW LEVEL SECURITY;
