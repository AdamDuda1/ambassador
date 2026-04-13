import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import { isUserAdmin } from "@/lib/applications/review";
import sql from "@/lib/database/client";
import { ensureSchema } from "@/lib/database/ensure-schema";
import { getSafeRedirectUrl, isSameOriginRequest } from "@/lib/http";
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
  const rawNote = formData.get("note");
  const trimmedNote = typeof rawNote === "string" ? rawNote.trim() : "";
  const nextNote = trimmedNote.length > 0 ? trimmedNote : null;

  const user = (await sql<{ id: string }[]>`
    SELECT id
    FROM users
    WHERE id = ${id}
    LIMIT 1
  `).at(0) ?? null;

  if (user === null) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  const latestNoteEvent = (await sql<{ note: string | null }[]>`
    SELECT note
    FROM user_note_events
    WHERE user_id = ${id}
    ORDER BY created_at DESC, id DESC
    LIMIT 1
  `).at(0) ?? null;

  const currentNote =
    latestNoteEvent !== null && latestNoteEvent.note !== null && latestNoteEvent.note.trim().length > 0
      ? latestNoteEvent.note.trim()
      : null;

  if (currentNote !== nextNote) {
    await sql`
      INSERT INTO user_note_events (id, user_id, note, created_by)
      VALUES (${randomUUID()}, ${id}, ${nextNote}, ${session.sub})
    `;
  }

  revalidatePath(`/admin/users/${id}`);

  return Response.redirect(
    getSafeRedirectUrl(request, formData.get("redirectTo"), `/admin/users/${id}`),
  );
}
