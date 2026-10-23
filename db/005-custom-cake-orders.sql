-- Custom cake orders paid through a link (admin → Cake inquiries → Create order). Run once after 004; safe to re-run.
-- Adds two statuses: awaiting_payment (link sent, not paid yet) and deposit_paid (deposit paid, balance due later).
ALTER TABLE bakery_cake_orders DROP CONSTRAINT IF EXISTS bakery_cake_orders_status_check;
ALTER TABLE bakery_cake_orders ADD CONSTRAINT bakery_cake_orders_status_check
  CHECK (status IN ('processing','awaiting_approval','paid','picked_up','declined','expired','failed',
                    'awaiting_payment','deposit_paid'));
