import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { handle } from "@/lib/http";
import { q } from "@/lib/db";
import { num } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return handle(req, async () => {
    const user = await getUser();
    if (!user) return NextResponse.json({ user: null });
    const counts = await q(
      `SELECT
        (SELECT count(*) FROM follows WHERE following_id = $1 AND status = 'active') AS followers,
        (SELECT count(*) FROM follows WHERE follower_id = $1 AND status = 'active') AS following,
        (SELECT count(*) FROM notifications WHERE user_id = $1 AND is_read = false) AS unread`,
      [user.id]
    );
    return NextResponse.json({
      user: { ...user, followers: num(counts.rows[0].followers), following: num(counts.rows[0].following), unread: num(counts.rows[0].unread) }
    });
  });
}
