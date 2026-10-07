import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { handle, fail } from "@/lib/http";
import { q } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return handle(req, async () => {
    const user = await requireUser();
    const rows = await q<{ author_id: string; is_pinned: boolean }>("SELECT author_id, is_pinned FROM posts WHERE id = $1", [params.id]);
    if (!rows.rows[0] || rows.rows[0].author_id !== user.id) return fail(403, "Forbidden");
    await q("UPDATE posts SET is_pinned = $1 WHERE id = $2", [!rows.rows[0].is_pinned, params.id]);
    return NextResponse.json({ pinned: !rows.rows[0].is_pinned });
  });
}
