import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { handle } from "@/lib/http";
import { q } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return handle(req, async () => {
    const user = await requireUser();
    await q("INSERT INTO hidden_posts (user_id, post_id) VALUES ($1,$2) ON CONFLICT DO NOTHING", [user.id, params.id]);
    return NextResponse.json({ ok: true });
  });
}
