import { randomUUID } from "node:crypto";

import { cookies } from "next/headers";

import { isUserAdmin } from "@/lib/applications/review";
import { ensureSchema } from "@/lib/database/ensure-schema";
import { isProduction } from "@/lib/env";
import {
  HCB_OAUTH_STATE_COOKIE_MAX_AGE_SECONDS,
  HCB_OAUTH_STATE_COOKIE_NAME,
} from "@/lib/hcb/constants";
import { getHcbAuthorizationUrl } from "@/lib/hcb/service";
import { getAppUrl, isSameOriginRequest } from "@/lib/http";
import { getActorSession } from "@/lib/session";

export async function POST(request: Request) {
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

  const state = randomUUID();
  const cookieStore = await cookies();

  cookieStore.set(HCB_OAUTH_STATE_COOKIE_NAME, state, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax",
    path: "/",
    maxAge: HCB_OAUTH_STATE_COOKIE_MAX_AGE_SECONDS,
  });

  return Response.redirect(getAppUrl(getHcbAuthorizationUrl(state), request), 303);
}
