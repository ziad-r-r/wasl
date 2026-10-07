import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { q } from "@/lib/db";
import { hashPassword, requireUser, verifyPassword } from "@/lib/auth";
import { handle, fail } from "@/lib/http";

export async function POST(req: NextRequest) {
  return handle(req, async () => {
    const user = await requireUser();
    const body = z.object({ current: z.string().min(8), next: z.string().min(8).max(80) }).parse(await req.json());
    const rows = await q<{ password_hash: string }>("SELECT password_hash FROM users WHERE id = $1", [user.id]);
    if (!(await verifyPassword(rows.rows[0].password_hash, body.current))) return fail(400, "Current password is wrong");
    await q("UPDATE users SET password_hash = $1 WHERE id = $2", [await hashPassword(body.next), user.id]);
    return NextResponse.json({ ok: true });
  });
}
