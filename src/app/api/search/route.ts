import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { handle } from "@/lib/http";
import { q } from "@/lib/db";
import { attachMedia, postSelect, shapePost } from "@/lib/social";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return handle(req, async () => {
    const user = await requireUser();
    const term = (req.nextUrl.searchParams.get("q") || "").trim().slice(0, 60);
    if (!term) {
      const suggested = await q(
        `SELECT u.id, u.username, p.display_name, p.avatar_url, p.bio
         FROM users u JOIN profiles p ON p.user_id = u.id
         WHERE u.id <> $1 AND u.is_disabled = false
           AND NOT EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = $1 AND f.following_id = u.id AND f.status = 'active')
         ORDER BY u.created_at DESC LIMIT 6`,
        [user.id]
      );
      return NextResponse.json({ users: suggested.rows, posts: [], tags: [] });
    }
    const like = `%${term.replace(/[%_]/g, "")}%`;
    const users = await q(
      `SELECT u.id, u.username, p.display_name, p.avatar_url, p.bio
       FROM users u JOIN profiles p ON p.user_id = u.id
       WHERE u.is_disabled = false AND (u.username ILIKE $1 OR p.display_name ILIKE $1)
       LIMIT 8`,
      [like]
    );
    const tags = await q("SELECT tag FROM hashtags WHERE tag ILIKE $1 ORDER BY tag LIMIT 8", [like.replace("#", "")]);
    const posts = await q(
      `${postSelect}
       FROM posts p JOIN users u ON u.id = p.author_id JOIN profiles pr ON pr.user_id = u.id
       WHERE p.is_hidden = false AND pr.is_private = false AND (p.caption ILIKE $2 OR p.location ILIKE $2)
       ORDER BY p.created_at DESC LIMIT 8`,
      [user.id, like]
    );
    const media = await attachMedia(posts.rows.map((r) => r.id));
    return NextResponse.json({ users: users.rows, tags: tags.rows, posts: posts.rows.map((r) => shapePost(r, media.get(r.id) || [])) });
  });
}
