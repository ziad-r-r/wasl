import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { handle, fail } from "@/lib/http";
import { q } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: { username: string } }) {
  return handle(req, async () => {
    const me = await requireUser();
    const users = await q<{ id: string }>("SELECT id FROM users WHERE username = $1", [params.username.toLowerCase()]);
    if (!users.rows[0] || users.rows[0].id === me.id) return fail(400, "Cannot block this account");
    const existing = await q("SELECT 1 FROM blocks WHERE blocker_id = $1 AND blocked_id = $2", [me.id, users.rows[0].id]);
    if (existing.rows[0]) {
      await q("DELETE FROM blocks WHERE blocker_id = $1 AND blocked_id = $2", [me.id, users.rows[0].id]);
      return NextResponse.json({ blocked: false });
    }
    await q("INSERT INTO blocks (blocker_id, blocked_id) VALUES ($1,$2)", [me.id, users.rows[0].id]);
    await q("DELETE FROM follows WHERE (follower_id = $1 AND following_id = $2) OR (follower_id = $2 AND following_id = $1)", [me.id, users.rows[0].id]);
    return NextResponse.json({ blocked: true });
  });
}
