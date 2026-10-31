-- Admin app push notifications. Run once after 007; safe to re-run.

-- One row per phone or computer that turned on notifications (admin → Settings → Notifications).
-- endpoint/p256dh/auth come from the browser's push subscription; they only let this server send to that device.
CREATE TABLE IF NOT EXISTS bakery_push_subscriptions (
 id uuid PRIMARY KEY,
 endpoint text NOT NULL UNIQUE,
 p256dh text NOT NULL,
 auth text NOT NULL,
 device_label text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(),
 last_ok_at timestamptz
);

-- Reminder pushes already sent, so each one goes out once (e.g. order X, 'answer-final').
CREATE TABLE IF NOT EXISTS bakery_push_reminders (
 order_id uuid NOT NULL,
 kind text NOT NULL,
 sent_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (order_id, kind)
);

-- No browser policies: only the trusted server database connection can access these records.
ALTER TABLE bakery_push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bakery_push_reminders ENABLE ROW LEVEL SECURITY;
