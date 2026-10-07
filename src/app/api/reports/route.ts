import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { handle } from "@/lib/http";
import { q } from "@/lib/db";
import { id } from "@/lib/ids";
import { logAction } from "@/lib/social";

export async function POST(req: NextRequest) {
  return handle(req, async () => {
    const user = await requireUser();
    const body = z.object({
      targetType: z.enum(["post", "user", "comment", "message", "story"]),
      targetId: z.string().min(4).max(40),
      reason: z.string().trim().min(3).max(300)
    }).parse(await req.json());
    await q("INSERT INTO reports (id, reporter_id, target_type, target_id, reason) VALUES ($1,$2,$3,$4,$5)", [id(), user.id, body.targetType, body.targetId, body.reason]);
    await logAction(user.id, "report", body);
    return NextResponse.json({ ok: true }, { status: 201 });
  });
}
