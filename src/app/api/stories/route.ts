import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { handle } from "@/lib/http";
import { q } from "@/lib/db";
import { id } from "@/lib/ids";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return handle(req, async () => {
    const user = await requireUser();
    const rows = await q(
      `SELECT s.id, s.media_url, s.media_type, s.caption, s.created_at, s.expires_at, u.username, p.display_name, p.avatar_url,
        EXISTS(SELECT 1 FROM story_views v WHERE v.story_id = s.id AND v.viewer_id = $1) AS seen,
        (SELECT count(*) FROM story_views v WHERE v.story_id = s.id) AS views
       FROM stories s
       JOIN users u ON u.id = s.author_id
       JOIN profiles p ON p.user_id = u.id
       WHERE s.expires_at > NOW()
         AND (s.author_id = $1 OR EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = $1 AND f.following_id = s.author_id AND f.status = 'active') OR p.is_private = false)
       ORDER BY s.created_at DESC`,
      [user.id]
    );
    return NextResponse.json({ stories: rows.rows });
  });
}

export async function POST(req: NextRequest) {
  return handle(req, async () => {
    const user = await requireUser();
    const body = z.object({
      mediaUrl: z.string().min(1).max(300),
      mediaType: z.enum(["image", "video"]),
      caption: z.string().max(140).default("")
    }).parse(await req.json());
    const sid = id();
    await q(
      "INSERT INTO stories (id, author_id, media_url, media_type, caption, expires_at) VALUES ($1,$2,$3,$4,$5, NOW() + interval '24 hours')",
      [sid, user.id, body.mediaUrl, body.mediaType, body.caption]
    );
    return NextResponse.json({ id: sid }, { status: 201 });
  });
}
