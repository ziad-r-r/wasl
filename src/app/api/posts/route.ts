import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { handle, fail } from "@/lib/http";
import { q } from "@/lib/db";
import { id } from "@/lib/ids";
import { syncTags } from "@/lib/social";

const schema = z.object({
  caption: z.string().max(2200).default(""),
  location: z.string().max(80).default(""),
  kind: z.enum(["post", "reel"]).default("post"),
  audioLabel: z.string().max(80).optional(),
  media: z.array(z.object({ url: z.string().min(1).max(300), mediaType: z.enum(["image", "video"]) })).min(1).max(8)
});

export async function POST(req: NextRequest) {
  return handle(req, async () => {
    const user = await requireUser();
    const body = schema.parse(await req.json());
    if (body.kind === "reel" && !body.media.some((m) => m.mediaType === "video" || m.mediaType === "image")) return fail(400, "Reel needs media");
    const pid = id();
    await q("INSERT INTO posts (id, author_id, caption, location, kind) VALUES ($1,$2,$3,$4,$5)", [pid, user.id, body.caption, body.location, body.kind]);
    for (let i = 0; i < body.media.length; i++) {
      await q("INSERT INTO post_media (id, post_id, url, media_type, sort_order) VALUES ($1,$2,$3,$4,$5)", [id(), pid, body.media[i].url, body.media[i].mediaType, i]);
    }
    if (body.kind === "reel") {
      await q("INSERT INTO reels (id, post_id, audio_label) VALUES ($1,$2,$3)", [id(), pid, body.audioLabel || ""]);
    }
    await syncTags(pid, body.caption, user.id);
    return NextResponse.json({ id: pid }, { status: 201 });
  });
}
