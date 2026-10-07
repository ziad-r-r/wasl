import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { handle, fail } from "@/lib/http";
import { q } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { username: string } }) {
  return handle(req, async () => {
    await requireUser();
    const users = await q<{ id: string }>("SELECT id FROM users WHERE username = $1", [params.username.toLowerCase()]);
    if (!users.rows[0]) return fail(404, "User not found");
    const rows = await q(
      `SELECT u.username, p.display_name, p.avatar_url FROM follows f
       JOIN users u ON u.id = f.follower_id JOIN profiles p ON p.user_id = u.id
       WHERE f.following_id = $1 AND f.status = 'active' ORDER BY f.created_at DESC`,
      [users.rows[0].id]
    );
    return NextResponse.json({ users: rows.rows });
  });
}
