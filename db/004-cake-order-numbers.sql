-- Sequential cake order numbers (#1001, #1002, ...). Run once after 003; safe to re-run.
-- Existing orders are numbered in the order they were placed; new orders get the next number.
CREATE SEQUENCE IF NOT EXISTS bakery_cake_order_no START 1001;
ALTER TABLE bakery_cake_orders ADD COLUMN IF NOT EXISTS order_no bigint;

WITH todo AS (
  SELECT id, row_number() OVER (ORDER BY created_at, id) AS n
  FROM bakery_cake_orders WHERE order_no IS NULL
)
UPDATE bakery_cake_orders o
SET order_no = (SELECT COALESCE(max(order_no), 1000) FROM bakery_cake_orders) + todo.n
FROM todo WHERE o.id = todo.id;

-- Continue after the highest number in use (never goes backwards).
SELECT setval(
  'bakery_cake_order_no',
  GREATEST(
    COALESCE((SELECT max(order_no) FROM bakery_cake_orders), 1000),
    (SELECT CASE WHEN is_called THEN last_value ELSE last_value - 1 END FROM bakery_cake_order_no)
  )
);

ALTER SEQUENCE bakery_cake_order_no OWNED BY bakery_cake_orders.order_no;
ALTER TABLE bakery_cake_orders ALTER COLUMN order_no SET DEFAULT nextval('bakery_cake_order_no');
ALTER TABLE bakery_cake_orders ALTER COLUMN order_no SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS bakery_cake_orders_order_no ON bakery_cake_orders (order_no);
