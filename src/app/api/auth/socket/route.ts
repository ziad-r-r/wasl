import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUser } from "@/lib/auth";
import { handle } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return handle(req, async () => {
    const user = await getUser();
    if (!user) return NextResponse.json({ token: null }, { status: 401 });
    return NextResponse.json({ token: cookies().get("wasl_session")?.value || null });
  });
}
