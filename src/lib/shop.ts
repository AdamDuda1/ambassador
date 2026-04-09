import type { HackClubAddress } from "@/lib/settings";

export const SHIRT_SIZES = ["S", "M", "L", "XL"] as const;
export type ShirtSize = (typeof SHIRT_SIZES)[number];

export function isShirtSize(value: unknown): value is ShirtSize {
  return typeof value === "string" && (SHIRT_SIZES as readonly string[]).includes(value);
}

export function shirtSku(size: ShirtSize) {
  return `Swa/Shirt/HC/${size}`;
}

export const ORDER_STATUS_PENDING = "pending";
export const ORDER_STATUS_APPROVED = "approved";
export const ORDER_STATUS_REJECTED = "rejected";
export const ORDER_STATUS_FAILED = "failed";

export type OrderStatus =
  | typeof ORDER_STATUS_PENDING
  | typeof ORDER_STATUS_APPROVED
  | typeof ORDER_STATUS_REJECTED
  | typeof ORDER_STATUS_FAILED;

export type ShopOrderRow = {
  id: string;
  user_id: string;
  status: OrderStatus | string;
  sku: string | null;
  variant: string | null;
  quantity: number;
  address: HackClubAddress | null;
  warehouse_order_id: string | null;
  warehouse_status: string | null;
  rejection_note: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
};

export function buildWarehouseTrackingUrl(warehouseOrderId: string) {
  return `https://mail.hackclub.com/warehouse_orders/${encodeURIComponent(warehouseOrderId)}`;
}
