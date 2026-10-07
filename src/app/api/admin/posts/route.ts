import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { handle, fail } from "@/lib/http";
import { q } from "@/lib/db";
import { logAction } from "@/lib/social";

export async function POST(req: NextRequest) {
  return handle(req, async () => {
    const user = await requireUser();
    if (user.role !== "admin") return fail(403, "Forbidden");
    const body = z.object({ postId: z.string() }).parse(await req.json());
    await q("DELETE FROM posts WHERE id = $1", [body.postId]);
    await logAction(user.id, "admin_delete_post", body);
    return NextResponse.json({ ok: true });
  });
}
