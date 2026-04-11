import { getSafeRedirectUrl, isSameOriginRequest } from "@/lib/http";
import { clearSession } from "@/lib/session";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const formData = await request.formData();
  await clearSession();

  return Response.redirect(getSafeRedirectUrl(request, formData.get("redirectTo"), "/"));
}
