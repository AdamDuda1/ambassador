import { clearCachedWarehouseStats } from "@/lib/admin/warehouse-stats-cache";
import { setLatestApplicationTshirtSentForUser } from "@/lib/applications/review";
import sql from "@/lib/database/client";
import {
  ORDER_STATUS_APPROVED,
  ORDER_STATUS_PENDING,
  SHIRT_SKU_PREFIX,
} from "@/lib/shop";
import {
  type HackClubAuthAddress,
  parseWarehouseOrderResponse,
  WarehouseApiClient,
  WarehouseApiError,
} from "@/lib/warehouse";

export type DispatchResult =
  | { kind: "dispatched"; warehouseOrderId: string }
  | { kind: "already_dispatched"; warehouseOrderId: string }
  | { kind: "warehouse_failed"; message: string }
  | { kind: "not_pending" }
  | { kind: "invalid_order" };

type DispatchOrderRow = {
  id: string;
  user_id: string;
  status: string;
  sku: string | null;
  variant: string | null;
  address: HackClubAuthAddress | null;
  warehouse_order_id: string | null;
  warehouse_status: string | null;
  warehouse_payload: unknown | null;
  email: string;
  display_name: string;
};

export async function dispatchShirtOrder({
  orderId,
  reviewerUserId,
}: {
  orderId: string;
  reviewerUserId: string | null;
}): Promise<DispatchResult> {
  const order = (await sql<DispatchOrderRow[]>`
    SELECT o.id, o.user_id, o.status, o.sku, o.variant, o.address,
           o.warehouse_order_id, o.warehouse_status, o.warehouse_payload,
           u.email, u.display_name
    FROM orders o
    JOIN users u ON u.id = o.user_id
    WHERE o.id = ${orderId}
    LIMIT 1
  `).at(0) ?? null;

  if (order === null) {
    return { kind: "invalid_order" };
  }

  if (order.status !== ORDER_STATUS_PENDING) {
    return { kind: "not_pending" };
  }

  if (order.sku === null || order.sku === "" || order.address === null) {
    return { kind: "invalid_order" };
  }

  const existingWarehouseOrder = parseWarehouseOrderResponse(order.warehouse_payload);
  const existingWarehouseOrderId =
    order.warehouse_order_id ?? existingWarehouseOrder?.id ?? null;
  const existingWarehouseStatus =
    order.warehouse_status ?? existingWarehouseOrder?.status ?? null;

  try {
    if (existingWarehouseOrderId !== null && existingWarehouseOrderId !== "") {
      await sql`
        UPDATE orders
        SET status = ${ORDER_STATUS_APPROVED},
            warehouse_order_id = ${existingWarehouseOrderId},
            warehouse_status = ${existingWarehouseStatus},
            note = NULL,
            internal_fail_reason = NULL,
            reviewed_at = NOW(),
            reviewed_by = ${reviewerUserId},
            updated_at = NOW()
        WHERE id = ${orderId} AND status = ${ORDER_STATUS_PENDING}
      `;

      await syncTshirtSent(order);
      clearCachedWarehouseStats();
      return { kind: "already_dispatched", warehouseOrderId: existingWarehouseOrderId };
    }

    const result = await new WarehouseApiClient().createOrder({
      sku: order.sku,
      quantity: 1,
      name: order.display_name,
      email: order.email,
      orderNumber: order.id,
      address: order.address,
      userFacingTitle: `Hack Club Ambassador shirt (${order.variant ?? ""})`.trim(),
      tags: ["Ambassadors"],
      metadata: {
        ambassador_order_id: order.id,
        ambassador_user_id: order.user_id,
      },
    });

    await sql`
      UPDATE orders
      SET status = ${ORDER_STATUS_APPROVED},
          warehouse_order_id = ${result.id},
          warehouse_status = ${result.status},
          warehouse_payload = CAST(${JSON.stringify(result)} AS JSONB),
          note = NULL,
          internal_fail_reason = NULL,
          reviewed_at = NOW(),
          reviewed_by = ${reviewerUserId},
          updated_at = NOW()
      WHERE id = ${orderId} AND status = ${ORDER_STATUS_PENDING}
    `;

    await syncTshirtSent(order);
    clearCachedWarehouseStats();
    return { kind: "dispatched", warehouseOrderId: result.id };
  } catch (error) {
    const message =
      error instanceof WarehouseApiError
        ? `Warehouse ${error.status}: ${typeof error.body === "string" ? error.body : JSON.stringify(error.body)}`
        : error instanceof Error
          ? error.message
          : "unknown error";

    await sql`
      UPDATE orders
      SET internal_fail_reason = ${message},
          updated_at = NOW()
      WHERE id = ${orderId}
    `;

    return { kind: "warehouse_failed", message };
  }
}

async function syncTshirtSent(order: DispatchOrderRow) {
  if (order.sku === null || !order.sku.startsWith(SHIRT_SKU_PREFIX)) return;
  try {
    await setLatestApplicationTshirtSentForUser(order.user_id, true);
  } catch (error) {
    console.error(`[orders] unable to sync tshirt-sent for order ${order.id}`, error);
  }
}
