import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { handle, fail } from "@/lib/http";
import { q } from "@/lib/db";
import { id } from "@/lib/ids";
import { notify } from "@/lib/social";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return handle(req, async () => {
    const user = await requireUser();
    const body = z.object({ body: z.string().trim().min(1).max(500), parentId: z.string().optional() }).parse(await req.json());
    const post = await q<{ author_id: string }>("SELECT author_id FROM posts WHERE id = $1", [params.id]);
    if (!post.rows[0]) return fail(404, "Post not found");
    const cid = id();
    await q("INSERT INTO comments (id, post_id, author_id, parent_id, body) VALUES ($1,$2,$3,$4,$5)", [cid, params.id, user.id, body.parentId || null, body.body]);
    await notify(post.rows[0].author_id, user.id, "comment", "post", params.id, body.body.slice(0, 80));
    if (body.parentId) {
      const parent = await q<{ author_id: string }>("SELECT author_id FROM comments WHERE id = $1", [body.parentId]);
      if (parent.rows[0]) await notify(parent.rows[0].author_id, user.id, "reply", "comment", cid, body.body.slice(0, 80));
    }
    return NextResponse.json({ id: cid }, { status: 201 });
  });
}
