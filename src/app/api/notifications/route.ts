import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { handle } from "@/lib/http";
import { q } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return handle(req, async () => {
    const user = await requireUser();
    const rows = await q(
      `SELECT n.id, n.type, n.body, n.is_read, n.created_at, n.entity_type, n.entity_id,
              u.username, p.display_name, p.avatar_url
       FROM notifications n
       LEFT JOIN users u ON u.id = n.actor_id
       LEFT JOIN profiles p ON p.user_id = u.id
       WHERE n.user_id = $1
       ORDER BY n.created_at DESC LIMIT 40`,
      [user.id]
    );
    return NextResponse.json({ notifications: rows.rows });
  });
}

export async function POST(req: NextRequest) {
  return handle(req, async () => {
    const user = await requireUser();
    await q("UPDATE notifications SET is_read = true WHERE user_id = $1", [user.id]);
    return NextResponse.json({ ok: true });
  });
}
