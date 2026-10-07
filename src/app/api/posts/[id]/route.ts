import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { handle, fail } from "@/lib/http";
import { q } from "@/lib/db";
import { attachMedia, postSelect, shapePost, syncTags, logAction } from "@/lib/social";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  return handle(req, async () => {
    const user = await requireUser();
    const rows = await q(`${postSelect} FROM posts p JOIN users u ON u.id = p.author_id JOIN profiles pr ON pr.user_id = u.id WHERE p.id = $2`, [user.id, params.id]);
    if (!rows.rows[0] || rows.rows[0].is_hidden && rows.rows[0].author_id !== user.id && user.role !== "admin") return fail(404, "Post not found");
    if (rows.rows[0].kind === "reel") await q("UPDATE posts SET view_count = view_count + 1 WHERE id = $1", [params.id]);
    const media = await attachMedia([params.id]);
    const comments = await q(
      `SELECT c.id, c.body, c.parent_id, c.created_at, u.username, p.display_name, p.avatar_url
       FROM comments c JOIN users u ON u.id = c.author_id JOIN profiles p ON p.user_id = u.id
       WHERE c.post_id = $1 ORDER BY c.created_at ASC`,
      [params.id]
    );
    return NextResponse.json({ post: shapePost(rows.rows[0], media.get(params.id) || []), comments: comments.rows });
  });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return handle(req, async () => {
    const user = await requireUser();
    const body = z.object({ caption: z.string().max(2200), location: z.string().max(80) }).parse(await req.json());
    const rows = await q("SELECT author_id FROM posts WHERE id = $1", [params.id]);
    if (!rows.rows[0]) return fail(404, "Post not found");
    if (rows.rows[0].author_id !== user.id) return fail(403, "Forbidden");
    await q("UPDATE posts SET caption=$1, location=$2, updated_at=NOW() WHERE id=$3", [body.caption, body.location, params.id]);
    await syncTags(params.id, body.caption, user.id);
    return NextResponse.json({ ok: true });
  });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  return handle(req, async () => {
    const user = await requireUser();
    const rows = await q("SELECT author_id FROM posts WHERE id = $1", [params.id]);
    if (!rows.rows[0]) return fail(404, "Post not found");
    if (rows.rows[0].author_id !== user.id && user.role !== "admin") return fail(403, "Forbidden");
    await q("DELETE FROM posts WHERE id = $1", [params.id]);
    await logAction(user.id, "delete_post", { postId: params.id });
    return NextResponse.json({ ok: true });
  });
}
