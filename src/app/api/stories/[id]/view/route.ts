import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { handle } from "@/lib/http";
import { q } from "@/lib/db";
import { notify } from "@/lib/social";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return handle(req, async () => {
    const user = await requireUser();
    const story = await q<{ author_id: string }>("SELECT author_id FROM stories WHERE id = $1 AND expires_at > NOW()", [params.id]);
    if (!story.rows[0]) return NextResponse.json({ ok: false }, { status: 404 });
    await q("INSERT INTO story_views (story_id, viewer_id) VALUES ($1,$2) ON CONFLICT DO NOTHING", [params.id, user.id]);
    const count = await q("SELECT count(*) AS views FROM story_views WHERE story_id = $1", [params.id]);
    if (story.rows[0].author_id !== user.id) await notify(story.rows[0].author_id, user.id, "story_view", "story", params.id, "viewed your story");
    return NextResponse.json({ views: Number(count.rows[0].views) });
  });
}
