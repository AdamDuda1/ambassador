import {
  createSinglePosterForUser,
  listPosterDataForUser,
} from "@/lib/posters/service";
import { posterErrorResponse, requirePosterSession } from "@/lib/posters/http";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await requirePosterSession();
    const data = await listPosterDataForUser(session.sub);
    return Response.json(data);
  } catch (error) {
    return posterErrorResponse(error, "Failed to load posters.", 500);
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

    const poster = await createSinglePosterForUser({
      userId: session.sub,
      campaignSlug: typeof payload?.campaignSlug === "string" ? payload.campaignSlug : undefined,
      posterType: typeof payload?.posterType === "string" ? payload.posterType : undefined,
      charset: typeof payload?.charset === "string" ? payload.charset : undefined,
    });

    return Response.json({ poster }, { status: 201 });
  } catch (error) {
    return posterErrorResponse(error, "Failed to create poster.");
  }
}
