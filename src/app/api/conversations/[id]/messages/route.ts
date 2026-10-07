import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { handle, fail } from "@/lib/http";
import { q } from "@/lib/db";
import { id } from "@/lib/ids";
import { notify } from "@/lib/social";
import { publish as emit } from "@/lib/bus";

export const dynamic = "force-dynamic";

async function member(conversationId: string, userId: string) {
  const rows = await q("SELECT 1 FROM conversation_members WHERE conversation_id = $1 AND user_id = $2", [conversationId, userId]);
  return !!rows.rows[0];
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  return handle(req, async () => {
    const user = await requireUser();
    if (!(await member(params.id, user.id))) return fail(403, "Forbidden");
    await q("UPDATE conversation_members SET last_read_at = NOW() WHERE conversation_id = $1 AND user_id = $2", [params.id, user.id]);
    const rows = await q(
      `SELECT m.id, m.body, m.media_url, m.media_type, m.reply_to_id, m.deleted_at, m.created_at, m.sender_id,
              u.username, p.display_name
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       JOIN profiles p ON p.user_id = u.id
       WHERE m.conversation_id = $1
       ORDER BY m.created_at ASC`,
      [params.id]
    );
    const ids = rows.rows.map((m) => m.id);
    const reactions = ids.length
      ? await q(
          `SELECT r.message_id, r.emoji, u.username FROM message_reactions r JOIN users u ON u.id = r.user_id WHERE r.message_id IN (${ids.map((_, i) => `$${i + 1}`).join(",")})`,
          ids
        )
      : { rows: [] as Array<Record<string, string>> };
    const grouped: Record<string, Array<{ emoji: string; username: string }>> = {};
    for (const row of reactions.rows) {
      grouped[row.message_id] = grouped[row.message_id] || [];
      grouped[row.message_id].push({ emoji: row.emoji, username: row.username });
    }
    return NextResponse.json({ messages: rows.rows.map((m) => ({ ...m, reactions: grouped[m.id] || [] })) });
  });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return handle(req, async () => {
    const user = await requireUser();
    if (!(await member(params.id, user.id))) return fail(403, "Forbidden");
    const body = z.object({
      body: z.string().max(2000).default(""),
      mediaUrl: z.string().max(300).optional(),
      mediaType: z.string().max(20).optional(),
      replyToId: z.string().optional()
    }).parse(await req.json());
    if (!body.body.trim() && !body.mediaUrl) return fail(400, "Message is empty");
    const mid = id();
    await q(
      "INSERT INTO messages (id, conversation_id, sender_id, body, media_url, media_type, reply_to_id) VALUES ($1,$2,$3,$4,$5,$6,$7)",
      [mid, params.id, user.id, body.body, body.mediaUrl || null, body.mediaType || null, body.replyToId || null]
    );
    const members = await q<{ user_id: string }>("SELECT user_id FROM conversation_members WHERE conversation_id = $1", [params.id]);
    const ids = members.rows.map((m) => m.user_id);
    emit({ type: "message", userIds: ids, conversationId: params.id, messageId: mid });
    for (const uid of ids) {
      if (uid !== user.id) await notify(uid, user.id, "message", "conversation", params.id, body.body.slice(0, 80) || "sent an attachment");
    }
    return NextResponse.json({ id: mid }, { status: 201 });
  });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  return handle(req, async () => {
    const user = await requireUser();
    const body = z.object({ messageId: z.string() }).parse(await req.json());
    const rows = await q("SELECT sender_id FROM messages WHERE id = $1 AND conversation_id = $2", [body.messageId, params.id]);
    if (!rows.rows[0] || rows.rows[0].sender_id !== user.id) return fail(403, "Forbidden");
    await q("UPDATE messages SET deleted_at = NOW(), body = '' WHERE id = $1", [body.messageId]);
    return NextResponse.json({ ok: true });
  });
}
