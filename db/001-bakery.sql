-- Run once before importing. Never auto-create or seed from a web request.
CREATE TABLE IF NOT EXISTS bakery_menu (
 id text PRIMARY KEY, name text NOT NULL, description text NOT NULL DEFAULT '',
 price_cents integer NOT NULL CHECK (price_cents BETWEEN 0 AND 99999999),
 image text NOT NULL, category text NOT NULL, active boolean NOT NULL DEFAULT true,
 position integer NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS bakery_campaigns (id text PRIMARY KEY, payload jsonb NOT NULL, position integer NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS bakery_orders (id uuid PRIMARY KEY, payload text NOT NULL, status text NOT NULL CHECK(status IN ('new','called','confirmed','picked_up','cancelled')), created_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS bakery_gallery (url text PRIMARY KEY, position integer NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS bakery_migrations (scope text PRIMARY KEY, imported_at timestamptz NOT NULL DEFAULT now(), record_count integer NOT NULL);

-- No browser policies: only the trusted server database connection can access these records.
ALTER TABLE bakery_menu ENABLE ROW LEVEL SECURITY;
ALTER TABLE bakery_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE bakery_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE bakery_gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE bakery_migrations ENABLE ROW LEVEL SECURITY;
