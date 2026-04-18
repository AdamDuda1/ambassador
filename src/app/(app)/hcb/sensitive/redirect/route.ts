import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { isUserAdmin } from "@/lib/applications/review";
import { logAdminActionEvent } from "@/lib/admin-action-events";
import { ensureSchema } from "@/lib/database/ensure-schema";
import {
  HCB_OAUTH_STATE_COOKIE_NAME,
} from "@/lib/hcb/constants";
import { saveHcbAuthorization } from "@/lib/hcb/service";
import { getAppUrl } from "@/lib/http";
import { getActorSession } from "@/lib/session";

function getOrdersRedirectUrl(request: Request, status: string) {
  const url = getAppUrl(`/admin/orders?hcb=${encodeURIComponent(status)}`, request);
  return url.toString();
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const state = url.searchParams.get("state")?.trim() ?? "";
  const code = url.searchParams.get("code")?.trim() ?? "";
  const oauthError = url.searchParams.get("error")?.trim() ?? "";
  const cookieStore = await cookies();
  const expectedState = cookieStore.get(HCB_OAUTH_STATE_COOKIE_NAME)?.value.trim() ?? "";

  cookieStore.delete(HCB_OAUTH_STATE_COOKIE_NAME);

  if (oauthError !== "") {
    return Response.redirect(getOrdersRedirectUrl(request, "denied"), 303);
  }

  if (state === "" || expectedState === "" || state !== expectedState) {
    return Response.redirect(getOrdersRedirectUrl(request, "invalid_state"), 303);
  }

  if (code === "") {
    return Response.redirect(getOrdersRedirectUrl(request, "missing_code"), 303);
  }

  const session = await getActorSession();
  if (!session) {
    return Response.redirect(getOrdersRedirectUrl(request, "forbidden"), 303);
  }

  await ensureSchema();
  if (!(await isUserAdmin(session.sub))) {
    return Response.redirect(getOrdersRedirectUrl(request, "forbidden"), 303);
  }

  try {
    const authorization = await saveHcbAuthorization({
      code,
      authorizedByUserId: session.sub,
    });

    await logAdminActionEvent({
      actorUserId: session.sub,
      action: "hcb_credentials_reauthorized",
      metadata: {
        authorizedHcbUserId: authorization.currentUser.id,
        authorizedHcbUserName: authorization.currentUser.name,
        authorizedHcbUserEmail: authorization.currentUser.email,
        scopes: authorization.scopes,
        expiresAt: authorization.expiresAt,
      },
    });
  } catch (error) {
    console.error("Failed to authorize HCB", { error });
    return Response.redirect(getOrdersRedirectUrl(request, "failed"), 303);
  }

  revalidatePath("/admin/orders");
  revalidatePath("/dashboard");

  return Response.redirect(getOrdersRedirectUrl(request, "connected"), 303);
}
