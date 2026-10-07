import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { handle, fail } from "@/lib/http";
import { q } from "@/lib/db";
import { logAction } from "@/lib/social";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return handle(req, async () => {
    const user = await requireUser();
    if (user.role !== "admin") return fail(403, "Forbidden");
    const rows = await q("SELECT u.id, u.email, u.username, u.role, u.is_disabled, u.created_at, p.display_name FROM users u JOIN profiles p ON p.user_id = u.id ORDER BY u.created_at DESC");
    return NextResponse.json({ users: rows.rows });
  });
}

export async function POST(req: NextRequest) {
  return handle(req, async () => {
    const user = await requireUser();
    if (user.role !== "admin") return fail(403, "Forbidden");
    const body = z.object({ userId: z.string(), disabled: z.boolean() }).parse(await req.json());
    await q("UPDATE users SET is_disabled = $1 WHERE id = $2", [body.disabled, body.userId]);
    if (body.disabled) await q("DELETE FROM sessions WHERE user_id = $1", [body.userId]);
    await logAction(user.id, body.disabled ? "disable_user" : "enable_user", { userId: body.userId });
    return NextResponse.json({ ok: true });
  });
}
