-- Discord: the first bot message about each cake order and custom cake inquiry. Run once after 011; safe to re-run.
-- Customer email replies are posted in that message's thread (lib/discord-replies.ts).
CREATE TABLE IF NOT EXISTS bakery_discord_messages (
 kind text NOT NULL CHECK (kind IN ('order','inquiry')),
 ref_id uuid NOT NULL,
 channel_id text NOT NULL,
 message_id text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (kind, ref_id)
);

-- No browser policies: only the trusted server database connection can access these records.
ALTER TABLE bakery_discord_messages ENABLE ROW LEVEL SECURITY;
