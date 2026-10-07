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
    const rows = await q(
      `SELECT r.*, u.username AS reporter FROM reports r JOIN users u ON u.id = r.reporter_id ORDER BY r.created_at DESC LIMIT 50`
    );
    return NextResponse.json({ reports: rows.rows });
  });
}

export async function POST(req: NextRequest) {
  return handle(req, async () => {
    const user = await requireUser();
    if (user.role !== "admin") return fail(403, "Forbidden");
    const body = z.object({ reportId: z.string(), status: z.enum(["reviewed", "dismissed", "actioned"]), hidePostId: z.string().optional() }).parse(await req.json());
    await q("UPDATE reports SET status = $1 WHERE id = $2", [body.status, body.reportId]);
    if (body.hidePostId) await q("UPDATE posts SET is_hidden = true WHERE id = $1", [body.hidePostId]);
    await logAction(user.id, "moderate_report", body);
    return NextResponse.json({ ok: true });
  });
}
