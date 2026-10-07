import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { handle } from "@/lib/http";
import { q } from "@/lib/db";
import { attachMedia, postSelect, shapePost } from "@/lib/social";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return handle(req, async () => {
    const user = await requireUser();
    const rows = await q(
      `${postSelect}
       FROM saved_posts sp
       JOIN posts p ON p.id = sp.post_id
       JOIN users u ON u.id = p.author_id
       JOIN profiles pr ON pr.user_id = u.id
       WHERE sp.user_id = $1
       ORDER BY sp.created_at DESC`,
      [user.id]
    );
    const media = await attachMedia(rows.rows.map((r) => r.id));
    return NextResponse.json({ posts: rows.rows.map((r) => shapePost(r, media.get(r.id) || [])) });
  });
}
