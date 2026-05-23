ALTER TABLE orders
ADD COLUMN IF NOT EXISTS dispatch_at TIMESTAMPTZ;

UPDATE orders
SET dispatch_at = NOW() + INTERVAL '24 hours'
WHERE dispatch_at IS NULL
  AND status = 'pending';

UPDATE orders
SET dispatch_at = created_at + INTERVAL '24 hours'
WHERE dispatch_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_orders_pending_dispatch_at
  ON orders(dispatch_at)
  WHERE status = 'pending';
