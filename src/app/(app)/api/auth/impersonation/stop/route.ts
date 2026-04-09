import { clearImpersonationSession } from "@/lib/session";
import { getSafeRedirectUrl, isSameOriginRequest } from "@/lib/http";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const formData = await request.formData();
  await clearImpersonationSession();

  return Response.redirect(getSafeRedirectUrl(request, formData.get("redirectTo"), "/dashboard"));
}
