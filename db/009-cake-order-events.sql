-- History of each cake order (placed, asked kitchen, approved, declined, hold ended, ...), shown on the order's
-- page in admin. Run once after 008; safe to re-run.
CREATE TABLE IF NOT EXISTS bakery_cake_order_events (
 id bigserial PRIMARY KEY,
 order_id uuid NOT NULL,
 at timestamptz NOT NULL DEFAULT now(),
 action text NOT NULL,
 from_status text,
 to_status text,
 detail text NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS bakery_cake_order_events_order ON bakery_cake_order_events (order_id, at);

-- No browser policies: only the trusted server database connection can access these records.
ALTER TABLE bakery_cake_order_events ENABLE ROW LEVEL SECURITY;
