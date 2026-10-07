import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { q } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handle, fail } from "@/lib/http";

const schema = z.object({
  displayName: z.string().trim().min(2).max(40),
  username: z.string().regex(/^[a-z0-9_.]{3,20}$/),
  bio: z.string().max(180),
  website: z.string().max(160),
  location: z.string().max(80),
  avatarUrl: z.string().max(300).nullable().optional(),
  coverUrl: z.string().max(300).nullable().optional(),
  isPrivate: z.boolean()
});

export async function PATCH(req: NextRequest) {
  return handle(req, async () => {
    const user = await requireUser();
    const body = schema.parse(await req.json());
    const taken = await q("SELECT id FROM users WHERE username = $1 AND id <> $2", [body.username.toLowerCase(), user.id]);
    if (taken.rows[0]) return fail(409, "Username is taken");
    await q("UPDATE users SET username = $1 WHERE id = $2", [body.username.toLowerCase(), user.id]);
    await q(
      `UPDATE profiles SET display_name=$1, bio=$2, website=$3, location=$4, avatar_url=$5, cover_url=$6, is_private=$7, updated_at=NOW() WHERE user_id=$8`,
      [body.displayName, body.bio, body.website, body.location, body.avatarUrl || null, body.coverUrl || null, body.isPrivate, user.id]
    );
    return NextResponse.json({ ok: true });
  });
}
