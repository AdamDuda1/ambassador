import { ImpersonationPill } from "@/components/impersonation-pill";
import { getSession } from "@/lib/session";

export async function AppImpersonationPill() {
  const session = await getSession();

  if (!session?.impersonator) {
    return null;
  }

  return (
    <ImpersonationPill
      subjectDisplayName={session.displayName}
      subjectId={session.sub}
    />
  );
}
