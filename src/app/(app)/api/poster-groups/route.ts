import {
  createPosterGroupForUser,
  listPosterDataForUser,
} from "@/lib/posters/service";
import { posterErrorResponse, requirePosterSession } from "@/lib/posters/http";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await requirePosterSession();
    const data = await listPosterDataForUser(session.sub);
    return Response.json({ groups: data.groups });
  } catch (error) {
    return posterErrorResponse(error, "Failed to load poster groups.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requirePosterSession();
    const body = await request.json();
    const payload: Record<string, unknown> | null =
      typeof body === "object" && body !== null && !Array.isArray(body)
        ? Object.fromEntries(Object.entries(body))
        : null;

    const result = await createPosterGroupForUser({
      userId: session.sub,
      campaignSlug: typeof payload?.campaignSlug === "string" ? payload.campaignSlug : undefined,
      count: typeof payload?.count === "number" && Number.isFinite(payload.count) ? payload.count : 1,
      name: typeof payload?.name === "string" ? payload.name : undefined,
      charset: typeof payload?.charset === "string" ? payload.charset : undefined,
      posterType: typeof payload?.posterType === "string" ? payload.posterType : undefined,
    });

    return Response.json(result, { status: 201 });
  } catch (error) {
    return posterErrorResponse(error, "Failed to create poster group.");
  }
}
