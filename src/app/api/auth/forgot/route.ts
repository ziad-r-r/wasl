import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { q } from "@/lib/db";
import { handle } from "@/lib/http";
import { hashToken, id, token } from "@/lib/ids";

export async function POST(req: NextRequest) {
  return handle(req, async () => {
    const body = z.object({ username: z.string().regex(/^[a-z0-9_.]{3,20}$/) }).parse(await req.json());
    const users = await q<{ id: string }>("SELECT id FROM users WHERE username = $1", [body.username.toLowerCase()]);
    let resetToken: string | null = null;
    if (users.rows[0]) {
      resetToken = token();
      await q(
        "INSERT INTO password_resets (id, user_id, token_hash, expires_at) VALUES ($1,$2,$3, NOW() + interval '30 minutes')",
        [id(), users.rows[0].id, hashToken(resetToken)]
      );
    }
    const payload: Record<string, unknown> = { ok: true, message: "If the username exists, a reset token was issued." };
    if (process.env.NODE_ENV !== "production") payload.devToken = resetToken;
    return NextResponse.json(payload);
  }, 6);
}
