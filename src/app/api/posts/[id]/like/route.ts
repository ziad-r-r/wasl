import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { handle, fail } from "@/lib/http";
import { q } from "@/lib/db";
import { notify } from "@/lib/social";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return handle(req, async () => {
    const user = await requireUser();
    const post = await q<{ author_id: string }>("SELECT author_id FROM posts WHERE id = $1", [params.id]);
    if (!post.rows[0]) return fail(404, "Post not found");
    const existing = await q("SELECT 1 FROM likes WHERE user_id = $1 AND post_id = $2", [user.id, params.id]);
    if (existing.rows[0]) {
      await q("DELETE FROM likes WHERE user_id = $1 AND post_id = $2", [user.id, params.id]);
      return NextResponse.json({ liked: false });
    }
    await q("INSERT INTO likes (user_id, post_id) VALUES ($1,$2)", [user.id, params.id]);
    await notify(post.rows[0].author_id, user.id, "like", "post", params.id, "liked your post");
    return NextResponse.json({ liked: true });
  });
}
