import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { handle, fail } from "@/lib/http";
import { q } from "@/lib/db";
import { id } from "@/lib/ids";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return handle(req, async () => {
    const user = await requireUser();
    const rows = await q(
      `SELECT c.id, c.title, c.is_group, c.created_at,
        (SELECT body FROM messages m WHERE m.conversation_id = c.id AND m.deleted_at IS NULL ORDER BY m.created_at DESC LIMIT 1) AS last_body,
        (SELECT created_at FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_at,
        (SELECT count(*) FROM messages m WHERE m.conversation_id = c.id AND m.created_at > COALESCE(cm.last_read_at, '1970-01-01') AND m.sender_id <> $1) AS unread
       FROM conversations c
       JOIN conversation_members cm ON cm.conversation_id = c.id AND cm.user_id = $1
       ORDER BY last_at DESC NULLS LAST`,
      [user.id]
    );
    const convIds = rows.rows.map((r) => r.id);
    let members: Record<string, unknown[]> = {};
    if (convIds.length) {
      const ph = convIds.map((_, i) => `$${i + 1}`).join(",");
      const mem = await q(
        `SELECT cm.conversation_id, u.username, p.display_name, p.avatar_url, pr.last_seen
         FROM conversation_members cm
         JOIN users u ON u.id = cm.user_id
         JOIN profiles p ON p.user_id = u.id
         LEFT JOIN presence pr ON pr.user_id = u.id
         WHERE cm.conversation_id IN (${ph})`,
        convIds
      );
      for (const row of mem.rows) {
        members[row.conversation_id] = members[row.conversation_id] || [];
        members[row.conversation_id].push(row);
      }
    }
    return NextResponse.json({ conversations: rows.rows.map((r) => ({ ...r, members: members[r.id] || [] })) });
  });
}

export async function POST(req: NextRequest) {
  return handle(req, async () => {
    const user = await requireUser();
    const body = z.object({ usernames: z.array(z.string()).min(1).max(12), title: z.string().max(60).optional() }).parse(await req.json());
    const ids = [user.id];
    for (const name of body.usernames) {
      const found = await q<{ id: string }>("SELECT id FROM users WHERE username = $1", [name.toLowerCase()]);
      if (!found.rows[0]) return fail(404, `User ${name} not found`);
      ids.push(found.rows[0].id);
    }
    const unique = Array.from(new Set(ids));
    if (unique.length === 2) {
      const existing = await q<{ id: string }>(
        `SELECT c.id FROM conversations c
         JOIN conversation_members a ON a.conversation_id = c.id AND a.user_id = $1
         JOIN conversation_members b ON b.conversation_id = c.id AND b.user_id = $2
         WHERE c.is_group = false`,
        [unique[0], unique[1]]
      );
      if (existing.rows[0]) return NextResponse.json({ id: existing.rows[0].id });
    }
    const cid = id();
    await q("INSERT INTO conversations (id, title, is_group) VALUES ($1,$2,$3)", [cid, body.title || "", unique.length > 2]);
    for (const uid of unique) await q("INSERT INTO conversation_members (conversation_id, user_id) VALUES ($1,$2)", [cid, uid]);
    return NextResponse.json({ id: cid }, { status: 201 });
  });
}
