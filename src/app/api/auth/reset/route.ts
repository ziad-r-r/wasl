import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { q } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { handle, fail } from "@/lib/http";
import { hashToken } from "@/lib/ids";

export async function POST(req: NextRequest) {
  return handle(req, async () => {
    const body = z.object({ token: z.string().min(20), password: z.string().min(8).max(80) }).parse(await req.json());
    const rows = await q<{ id: string; user_id: string }>(
      "SELECT id, user_id FROM password_resets WHERE token_hash = $1 AND used = false AND expires_at > NOW()",
      [hashToken(body.token)]
    );
    if (!rows.rows[0]) return fail(400, "Reset token is invalid or expired");
    await q("UPDATE users SET password_hash = $1 WHERE id = $2", [await hashPassword(body.password), rows.rows[0].user_id]);
    await q("UPDATE password_resets SET used = true WHERE id = $1", [rows.rows[0].id]);
    await q("DELETE FROM sessions WHERE user_id = $1", [rows.rows[0].user_id]);
    return NextResponse.json({ ok: true });
  }, 8);
}
