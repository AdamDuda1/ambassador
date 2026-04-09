import { revalidatePath } from "next/cache";

import { isUserAdmin } from "@/lib/applications/review";
import sql from "@/lib/database/client";
import { ensureSchema } from "@/lib/database/ensure-schema";
import { getSafeRedirectUrl, isSameOriginRequest } from "@/lib/http";
import { getActorSession } from "@/lib/session";

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

  const [updatedUser] = await sql<{ id: string }[]>`
    UPDATE users
    SET is_admin = TRUE,
        updated_at = NOW()
    WHERE id = ${id}
    RETURNING id
  `;

  if (!updatedUser) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  revalidatePath(`/admin/users/${id}`);
  revalidatePath("/admin/users");

  return Response.redirect(getSafeRedirectUrl(request, formData.get("redirectTo"), `/admin/users/${id}`));
}
