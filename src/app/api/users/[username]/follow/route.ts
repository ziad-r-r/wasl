import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { handle, fail } from "@/lib/http";
import { q } from "@/lib/db";
import { notify } from "@/lib/social";

export async function POST(req: NextRequest, { params }: { params: { username: string } }) {
  return handle(req, async () => {
    const me = await requireUser();
    const users = await q<{ id: string; is_private: boolean }>(
      "SELECT u.id, p.is_private FROM users u JOIN profiles p ON p.user_id = u.id WHERE u.username = $1",
      [params.username.toLowerCase()]
    );
    if (!users.rows[0] || users.rows[0].id === me.id) return fail(400, "Cannot follow this account");
    const existing = await q("SELECT status FROM follows WHERE follower_id = $1 AND following_id = $2", [me.id, users.rows[0].id]);
    if (existing.rows[0]) {
      await q("DELETE FROM follows WHERE follower_id = $1 AND following_id = $2", [me.id, users.rows[0].id]);
      return NextResponse.json({ following: false, requested: false });
    }
    const status = users.rows[0].is_private ? "pending" : "active";
    await q("INSERT INTO follows (follower_id, following_id, status) VALUES ($1,$2,$3)", [me.id, users.rows[0].id, status]);
    await notify(users.rows[0].id, me.id, status === "pending" ? "follow_request" : "follow", "user", me.id, status === "pending" ? "requested to follow you" : "started following you");
    return NextResponse.json({ following: status === "active", requested: status === "pending" });
  });
}
