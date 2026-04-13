import { logAdminActionEvent } from "@/lib/admin-action-events";
import { isUserAdmin, setApplicationTshirtSent } from "@/lib/applications/review";
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
  const sent = formData.get("sent") === "true";
  const existingApplication = (await sql<{
    id: string;
    user_id: string | null;
    tshirt_sent: boolean | null;
  }[]>`
    SELECT id, user_id, tshirt_shipped AS tshirt_sent
    FROM applications
    WHERE id = ${id}
    LIMIT 1
  `).at(0) ?? null;

  if (existingApplication === null) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  const updatedApplication = await setApplicationTshirtSent(id, sent);

  if (!updatedApplication) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  if (Boolean(existingApplication.tshirt_sent) !== sent) {
    await logAdminActionEvent({
      actorUserId: session.sub,
      targetUserId: existingApplication.user_id ?? null,
      action: "application_tshirt_sent_updated",
      metadata: {
        applicationId: id,
        previousSent: Boolean(existingApplication.tshirt_sent),
        nextSent: sent,
      },
    });
  }

  return Response.redirect(
    getSafeRedirectUrl(request, formData.get("redirectTo"), `/admin/applications/${id}`),
  );
}