-- Admin "Refund": a paid cake order whose online payment was refunded through Square. Run once; safe to re-run.
-- Run in Supabase (SQL editor) before deploying the Nov 1, 2026 refund button.
ALTER TABLE bakery_cake_orders DROP CONSTRAINT IF EXISTS bakery_cake_orders_status_check;
ALTER TABLE bakery_cake_orders ADD CONSTRAINT bakery_cake_orders_status_check
  CHECK (status IN ('processing','awaiting_approval','paid','picked_up','declined','expired','failed',
                    'awaiting_payment','deposit_paid','checking_kitchen','hold_expired','refunded'));
