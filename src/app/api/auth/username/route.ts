import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { q } from "@/lib/db";
import { handle } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return handle(req, async () => {
    const username = (req.nextUrl.searchParams.get("u") || "").toLowerCase();
    const valid = /^[a-z0-9_.]{3,20}$/.test(username);
    if (!valid) return NextResponse.json({ available: false, valid: false });
    const taken = await q("SELECT id FROM users WHERE username = $1", [username]);
    return NextResponse.json({ available: !taken.rows[0], valid: true, username });
  });
}
