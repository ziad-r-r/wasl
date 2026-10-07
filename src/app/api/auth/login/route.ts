import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { q } from "@/lib/db";
import { createSession, verifyPassword } from "@/lib/auth";
import { handle, fail } from "@/lib/http";
import { logAction } from "@/lib/social";

const schema = z.object({ identity: z.string().min(3).max(20), password: z.string().min(8).max(80) });

export async function POST(req: NextRequest) {
  return handle(req, async () => {
    const body = schema.parse(await req.json());
    const rows = await q<{ id: string; password_hash: string; is_disabled: boolean }>(
      "SELECT id, password_hash, is_disabled FROM users WHERE username = $1",
      [body.identity.toLowerCase()]
    );
    const user = rows.rows[0];
    if (!user || !(await verifyPassword(user.password_hash, body.password))) return fail(401, "Invalid credentials");
    if (user.is_disabled) return fail(403, "Account is disabled");
    await createSession(user.id);
    await logAction(user.id, "login", {});
    return NextResponse.json({ ok: true });
  }, 10);
}
