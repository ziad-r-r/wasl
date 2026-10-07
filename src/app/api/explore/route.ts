import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { handle } from "@/lib/http";
import { q } from "@/lib/db";
import { attachMedia, postSelect, shapePost } from "@/lib/social";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return handle(req, async () => {
    const user = await requireUser();
    const offset = Math.max(0, Number(req.nextUrl.searchParams.get("offset") || 0));
    const rows = await q(
      `${postSelect}
       FROM posts p
       JOIN users u ON u.id = p.author_id
       JOIN profiles pr ON pr.user_id = u.id
       WHERE p.is_hidden = false AND pr.is_private = false AND u.is_disabled = false
         AND NOT EXISTS (SELECT 1 FROM blocks b WHERE (b.blocker_id = $1 AND b.blocked_id = p.author_id) OR (b.blocker_id = p.author_id AND b.blocked_id = $1))
       ORDER BY p.created_at DESC
       LIMIT 12 OFFSET $2`,
      [user.id, offset]
    );
    const media = await attachMedia(rows.rows.map((r) => r.id));
    return NextResponse.json({ posts: rows.rows.map((r) => shapePost(r, media.get(r.id) || [])) });
  });
}
