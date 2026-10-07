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
    const body = z.object({ body: z.string().trim().min(1).max(300) }).parse(await req.json());
    const story = await q<{ author_id: string }>("SELECT author_id FROM stories WHERE id = $1 AND expires_at > NOW()", [params.id]);
    if (!story.rows[0]) return fail(404, "Story not found");
    await q("INSERT INTO story_replies (id, story_id, author_id, body) VALUES ($1,$2,$3,$4)", [id(), params.id, user.id, body.body]);
    await notify(story.rows[0].author_id, user.id, "story_reply", "story", params.id, body.body.slice(0, 80));
    return NextResponse.json({ ok: true }, { status: 201 });
  });
}
