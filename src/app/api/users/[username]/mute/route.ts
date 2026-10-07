import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { handle, fail } from "@/lib/http";
import { q } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: { username: string } }) {
  return handle(req, async () => {
    const me = await requireUser();
    const users = await q<{ id: string }>("SELECT id FROM users WHERE username = $1", [params.username.toLowerCase()]);
    if (!users.rows[0]) return fail(404, "User not found");
    const existing = await q("SELECT 1 FROM mutes WHERE muter_id = $1 AND muted_id = $2", [me.id, users.rows[0].id]);
    if (existing.rows[0]) {
      await q("DELETE FROM mutes WHERE muter_id = $1 AND muted_id = $2", [me.id, users.rows[0].id]);
      return NextResponse.json({ muted: false });
    }
    await q("INSERT INTO mutes (muter_id, muted_id) VALUES ($1,$2)", [me.id, users.rows[0].id]);
    return NextResponse.json({ muted: true });
  });
}
