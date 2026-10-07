import { NextRequest, NextResponse } from "next/server";
import { clearSession } from "@/lib/auth";
import { handle } from "@/lib/http";

export async function POST(req: NextRequest) {
  return handle(req, async () => {
    await clearSession();
    return NextResponse.json({ ok: true });
  });
}
