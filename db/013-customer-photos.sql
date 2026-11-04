-- Photos customers send from the thank-you email (/photos/<order id>), shown in admin → Customer photos.
-- Run once after 012; safe to re-run. The photos themselves are private, encrypted files in storage
-- (customer-photos/<order id>/...); a photo goes public only when it is added to the gallery from admin.
CREATE TABLE IF NOT EXISTS bakery_customer_photos (
 id uuid PRIMARY KEY,                    -- one per "Send" on the page
 order_id uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 note text NOT NULL DEFAULT '',          -- encrypted
 consent boolean NOT NULL DEFAULT false, -- "OK to show on your website"
 photos jsonb NOT NULL DEFAULT '[]'      -- [{ "file": "<name>.jpg", "gallery": "<public url once added>" }]
);
CREATE INDEX IF NOT EXISTS bakery_customer_photos_order ON bakery_customer_photos (order_id);

-- No browser policies: only the trusted server database connection can access these records.
ALTER TABLE bakery_customer_photos ENABLE ROW LEVEL SECURITY;
