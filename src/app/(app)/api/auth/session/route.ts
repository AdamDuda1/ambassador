import { getActorSession, getSession } from "@/lib/session";

export async function GET() {
  const [session, actorSession] = await Promise.all([getSession(), getActorSession()]);

  if (!session) {
    return Response.json({
      isAuthenticated: false,
      isAdmin: false,
      isImpersonating: false,
      impersonation: null,
    });
  }

  return Response.json({
    isAuthenticated: true,
    isAdmin: Boolean(actorSession?.isAdmin ?? session.isAdmin),
    isImpersonating: Boolean(session.impersonator),
    impersonation: session.impersonator
      ? {
          actorId: session.impersonator.sub,
          actorDisplayName: session.impersonator.displayName,
          subjectId: session.sub,
          subjectDisplayName: session.displayName,
        }
      : null,
  });
}
