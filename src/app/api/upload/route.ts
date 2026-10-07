import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { handle, fail } from "@/lib/http";
import { storeUpload } from "@/lib/storage";

export async function POST(req: NextRequest) {
  return handle(req, async () => {
    await requireUser();
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return fail(400, "File is required");
    const stored = await storeUpload(file);
    return NextResponse.json(stored, { status: 201 });
  }, 20);
}
