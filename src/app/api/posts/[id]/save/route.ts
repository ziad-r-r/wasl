import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { handle } from "@/lib/http";
import { q } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return handle(req, async () => {
    const user = await requireUser();
    const existing = await q("SELECT 1 FROM saved_posts WHERE user_id = $1 AND post_id = $2", [user.id, params.id]);
    if (existing.rows[0]) {
      await q("DELETE FROM saved_posts WHERE user_id = $1 AND post_id = $2", [user.id, params.id]);
      return NextResponse.json({ saved: false });
    }
    await q("INSERT INTO saved_posts (user_id, post_id) VALUES ($1,$2)", [user.id, params.id]);
    return NextResponse.json({ saved: true });
  });
}
