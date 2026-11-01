-- Admin app: track the kitchen step of each cake order. Run once after 006; safe to re-run.
-- checking_kitchen: card still held, the kitchen has been asked if it can make the cake.
-- hold_expired: Square released the card hold before the order was approved (approving then sends a pay link).
ALTER TABLE bakery_cake_orders DROP CONSTRAINT IF EXISTS bakery_cake_orders_status_check;
ALTER TABLE bakery_cake_orders ADD CONSTRAINT bakery_cake_orders_status_check
  CHECK (status IN ('processing','awaiting_approval','paid','picked_up','declined','expired','failed',
                    'awaiting_payment','deposit_paid','checking_kitchen','hold_expired','refunded'));

-- When the kitchen was asked about the order, and when the final details were texted to the kitchen.
ALTER TABLE bakery_cake_orders ADD COLUMN IF NOT EXISTS kitchen_asked_at timestamptz;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'bakery_cake_orders' AND column_name = 'kitchen_sent_at') THEN
    ALTER TABLE bakery_cake_orders ADD COLUMN kitchen_sent_at timestamptz;
    -- Orders paid before this existed were already passed to the kitchen by hand (first run only).
    UPDATE bakery_cake_orders SET kitchen_sent_at = updated_at WHERE status IN ('paid','deposit_paid','picked_up');
  END IF;
END $$;
