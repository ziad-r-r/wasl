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
      `${postSelect}, r.audio_label
       FROM posts p
       JOIN reels r ON r.post_id = p.id
       JOIN users u ON u.id = p.author_id
       JOIN profiles pr ON pr.user_id = u.id
       WHERE p.kind = 'reel' AND p.is_hidden = false AND pr.is_private = false
       ORDER BY p.created_at DESC
       LIMIT 8 OFFSET $2`,
      [user.id, offset]
    );
    const media = await attachMedia(rows.rows.map((r) => r.id));
    return NextResponse.json({
      reels: rows.rows.map((r) => ({ ...shapePost(r, media.get(r.id) || []), audioLabel: r.audio_label }))
    });
  });
}
