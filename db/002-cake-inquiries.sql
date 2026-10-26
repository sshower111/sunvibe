-- Custom cake inquiries submitted on /custom-cakes. Run once; safe to re-run.
-- payload and staff_notes are encrypted by the server (lib/storage-crypto.ts); reference photos are stored encrypted in Storage (lib/inquiry-photos.ts).
CREATE TABLE IF NOT EXISTS bakery_cake_inquiries (
 id uuid PRIMARY KEY,
 payload text NOT NULL,
 status text NOT NULL DEFAULT 'new'
  CHECK (status IN ('new','waiting_customer','checking_owner','confirmed_paid','completed','cancelled')),
 staff_notes text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bakery_cake_inquiries_created_at ON bakery_cake_inquiries (created_at DESC);

-- No browser policies: only the trusted server database connection can access these records.
ALTER TABLE bakery_cake_inquiries ENABLE ROW LEVEL SECURITY;
