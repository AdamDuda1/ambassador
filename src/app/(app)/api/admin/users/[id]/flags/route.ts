import { logAdminActionEvent } from "@/lib/admin-action-events";
import { isUserAdmin } from "@/lib/applications/review";
import { revalidatePath } from "next/cache";
import sql from "@/lib/database/client";
import { ensureSchema } from "@/lib/database/ensure-schema";
import { getSafeRedirectUrl, isSameOriginRequest } from "@/lib/http";
import {
  addUserFeatureFlagOverride,
  isSafeguardKey,
  removeUserFeatureFlagOverride,
} from "@/lib/safeguards";
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
  const flagKey = formData.get("flagKey");
  const action = formData.get("action");

  if (!isSafeguardKey(flagKey) || (action !== "enable" && action !== "disable")) {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  const targetUser = (await sql<{ id: string }[]>`
    SELECT id FROM users WHERE id = ${id} LIMIT 1
  `).at(0) ?? null;

  if (targetUser === null) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  let changed = false;
  if (action === "enable") {
    changed = await addUserFeatureFlagOverride({
      userId: id,
      flagKey,
      createdByUserId: session.sub,
    });
  } else {
    changed = await removeUserFeatureFlagOverride({ userId: id, flagKey });
  }

  if (changed) {
    await logAdminActionEvent({
      actorUserId: session.sub,
      targetUserId: id,
      action: "user_feature_flag_override_updated",
      metadata: {
        flagKey,
        nextOverrideEnabled: action === "enable",
      },
    });
  }

  revalidatePath(`/admin/users/${id}`);
  revalidatePath("/admin/safeguards");
  revalidatePath("/posters");
  revalidatePath("/referrals");
  revalidatePath("/dashboard");

  return Response.redirect(getSafeRedirectUrl(request, formData.get("redirectTo"), `/admin/users/${id}`));
}
