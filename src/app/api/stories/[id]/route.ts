import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { handle, fail } from "@/lib/http";
import { q } from "@/lib/db";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  return handle(req, async () => {
    const user = await requireUser();
    const rows = await q("SELECT author_id FROM stories WHERE id = $1", [params.id]);
    if (!rows.rows[0]) return fail(404, "Story not found");
    if (rows.rows[0].author_id !== user.id && user.role !== "admin") return fail(403, "Forbidden");
    await q("DELETE FROM stories WHERE id = $1", [params.id]);
    return NextResponse.json({ ok: true });
  });
}
