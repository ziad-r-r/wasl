import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { q } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/auth";
import { handle, fail } from "@/lib/http";
import { id } from "@/lib/ids";
import { logAction } from "@/lib/social";

const schema = z.object({
  username: z.string().regex(/^[a-z0-9_.]{3,20}$/, "Username must be 3–20 letters, numbers, . or _"),
  displayName: z.string().trim().min(2).max(40),
  password: z.string().min(8).max(80)
});

export async function POST(req: NextRequest) {
  return handle(req, async () => {
    const body = schema.parse(await req.json());
    const username = body.username.toLowerCase();
    const taken = await q("SELECT id FROM users WHERE username = $1", [username]);
    if (taken.rows[0]) return fail(409, "Username is already used");
    const uid = id();
    await q("INSERT INTO users (id, username, password_hash) VALUES ($1,$2,$3)", [uid, username, await hashPassword(body.password)]);
    await q("INSERT INTO profiles (user_id, display_name) VALUES ($1,$2)", [uid, body.displayName]);
    await createSession(uid);
    await logAction(uid, "register", { username });
    return NextResponse.json({ ok: true, id: uid, username }, { status: 201 });
  }, 8);
}
