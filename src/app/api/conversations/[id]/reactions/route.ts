import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { handle, fail } from "@/lib/http";
import { q } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return handle(req, async () => {
    const user = await requireUser();
    const member = await q("SELECT 1 FROM conversation_members WHERE conversation_id = $1 AND user_id = $2", [params.id, user.id]);
    if (!member.rows[0]) return fail(403, "Forbidden");
    const body = z.object({ messageId: z.string(), emoji: z.string().min(1).max(8) }).parse(await req.json());
    const existing = await q("SELECT 1 FROM message_reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3", [body.messageId, user.id, body.emoji]);
    if (existing.rows[0]) {
      await q("DELETE FROM message_reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3", [body.messageId, user.id, body.emoji]);
      return NextResponse.json({ on: false });
    }
    await q("INSERT INTO message_reactions (message_id, user_id, emoji) VALUES ($1,$2,$3)", [body.messageId, user.id, body.emoji]);
    return NextResponse.json({ on: true });
  });
}
