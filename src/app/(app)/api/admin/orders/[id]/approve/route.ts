import { revalidatePath } from "next/cache";

import { isUserAdmin } from "@/lib/applications/review";
import sql from "@/lib/database/client";
import { ensureSchema } from "@/lib/database/ensure-schema";
import { getSafeRedirectUrl, isSameOriginRequest } from "@/lib/http";
import { getActorSession } from "@/lib/session";
import { dispatchShirtOrder } from "@/lib/shirt/dispatch";

type OrderRow = {
  id: string;
  user_id: string;
  status: string;
};

type OrderIdRow = {
  id: string;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const session = await getActorSession();
  if (!session) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  await ensureSchema();
  if (!(await isUserAdmin(session.sub))) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const formData = await request.formData();

  const order = (await sql<OrderRow[]>`
    SELECT id, user_id, status FROM orders WHERE id = ${id} LIMIT 1
  `).at(0) ?? null;
  if (order === null) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  const latestOrder = (await sql<OrderIdRow[]>`
    SELECT id
    FROM orders
    WHERE user_id = ${order.user_id}
    ORDER BY created_at DESC, id DESC
    LIMIT 1
  `).at(0) ?? null;

  if (latestOrder?.id !== order.id) {
    return Response.json({ error: "historical_order" }, { status: 409 });
  }

  const result = await dispatchShirtOrder({ orderId: id, reviewerUserId: session.sub });

  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/users/${order.user_id}`);
  revalidatePath("/dashboard");

  if (result.kind === "not_pending") {
    return Response.json({ error: "invalid_order_status" }, { status: 409 });
  }
  if (result.kind === "invalid_order") {
    return Response.json({ error: "invalid_order" }, { status: 400 });
  }

  return Response.redirect(getSafeRedirectUrl(request, formData.get("redirectTo"), `/admin/orders`));
}
