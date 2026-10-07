import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { handle, fail } from "@/lib/http";
import { q } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return handle(req, async () => {
    const user = await requireUser();
    if (user.role !== "admin") return fail(403, "Forbidden");
    const rows = await q("SELECT l.*, u.username FROM audit_logs l LEFT JOIN users u ON u.id = l.actor_id ORDER BY l.created_at DESC LIMIT 40");
    return NextResponse.json({ logs: rows.rows });
  });
}
