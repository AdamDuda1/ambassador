import { isUserAdmin } from "@/lib/applications/review";
import sql from "@/lib/database/client";
import { ensureSchema } from "@/lib/database/ensure-schema";
import { getSafeRedirectPath, isSameOriginRequest } from "@/lib/http";
import { getSession } from "@/lib/session";
import { ORDER_STATUS_PENDING, ORDER_STATUS_REJECTED } from "@/lib/shop";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const session = await getSession();
  if (!session) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  await ensureSchema();
  if (!(await isUserAdmin(session.sub))) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const formData = await request.formData();
  const note = (formData.get("note") as string | null)?.trim() || null;

  const [order] = await sql`
    SELECT id, status FROM orders WHERE id = ${id} LIMIT 1
  `;
  if (!order) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }
  if (order.status !== ORDER_STATUS_PENDING) {
    return Response.json({ error: "already_reviewed" }, { status: 409 });
  }

  await sql`
    UPDATE orders
    SET status = ${ORDER_STATUS_REJECTED},
        rejection_note = ${note},
        reviewed_at = NOW(),
        reviewed_by = ${session.sub},
        updated_at = NOW()
    WHERE id = ${id}
  `;

  return Response.redirect(
    new URL(
      getSafeRedirectPath(formData.get("redirectTo"), `/admin/orders`),
      request.url,
    ),
  );
}
