-- Standard cake orders paid online on /order-cake. Run once; safe to re-run.
-- payload (customer details) is encrypted by the server (lib/storage-crypto.ts).
CREATE TABLE IF NOT EXISTS bakery_cake_orders (
 id uuid PRIMARY KEY,
 payload text NOT NULL,
 status text NOT NULL
  CHECK (status IN ('processing','awaiting_approval','paid','picked_up','declined','expired','failed')),
 payment_id text UNIQUE,
 approve_by timestamptz,
 pickup_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bakery_cake_orders_created_at ON bakery_cake_orders (created_at DESC);

-- No browser policies: only the trusted server database connection can access these records.
ALTER TABLE bakery_cake_orders ENABLE ROW LEVEL SECURITY;
