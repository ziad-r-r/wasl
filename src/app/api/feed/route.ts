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
       WHERE p.kind = 'post' AND p.is_hidden = false AND u.is_disabled = false
         AND NOT EXISTS (SELECT 1 FROM hidden_posts h WHERE h.user_id = $1 AND h.post_id = p.id)
         AND NOT EXISTS (SELECT 1 FROM blocks b WHERE (b.blocker_id = $1 AND b.blocked_id = p.author_id) OR (b.blocker_id = p.author_id AND b.blocked_id = $1))
         AND NOT EXISTS (SELECT 1 FROM mutes m WHERE m.muter_id = $1 AND m.muted_id = p.author_id)
         AND (p.author_id = $1 OR pr.is_private = false OR EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = $1 AND f.following_id = p.author_id AND f.status = 'active'))
       ORDER BY
         CASE WHEN EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = $1 AND f.following_id = p.author_id AND f.status = 'active') OR p.author_id = $1 THEN 0 ELSE 1 END,
         (SELECT count(*) FROM likes l WHERE l.post_id = p.id) DESC,
         p.created_at DESC
       LIMIT 8 OFFSET $2`,
      [user.id, offset]
    );
    const media = await attachMedia(rows.rows.map((r) => r.id));
    return NextResponse.json({ posts: rows.rows.map((r) => shapePost(r, media.get(r.id) || [])), nextOffset: offset + rows.rows.length });
  });
}
