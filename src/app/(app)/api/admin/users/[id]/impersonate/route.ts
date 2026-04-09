import { isUserAdmin } from "@/lib/applications/review";
import sql from "@/lib/database/client";
import { ensureSchema } from "@/lib/database/ensure-schema";
import { getSafeRedirectUrl, isSameOriginRequest } from "@/lib/http";
import {
  clearImpersonationSession,
  createImpersonationToken,
  getActorSession,
  setImpersonationSession,
  type TokenPayload,
} from "@/lib/session";

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

  if (id === session.sub) {
    await clearImpersonationSession();
    return Response.redirect(getSafeRedirectUrl(request, formData.get("redirectTo"), "/dashboard"));
  }

  const [user] = await sql<{
    id: string;
    email: string | null;
    display_name: string | null;
    slack_id: string | null;
    is_admin: boolean | null;
  }[]>`
    SELECT id, email, display_name, slack_id, is_admin
    FROM users
    WHERE id = ${id}
    LIMIT 1
  `;

  if (!user) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  const subject: TokenPayload = {
    sub: user.id,
    email: user.email ?? undefined,
    displayName: user.display_name?.trim() || user.email?.trim() || user.id,
    slackId: user.slack_id ?? undefined,
    isAdmin: Boolean(user.is_admin),
  };
  const token = await createImpersonationToken({
    actor: session,
    subject,
    startedAt: new Date().toISOString(),
  });

  await setImpersonationSession(token);

  return Response.redirect(getSafeRedirectUrl(request, formData.get("redirectTo"), "/dashboard"));
}
