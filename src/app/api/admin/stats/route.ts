import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { handle, fail } from "@/lib/http";
import { q } from "@/lib/db";
import { num } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return handle(req, async () => {
    const user = await requireUser();
    if (user.role !== "admin") return fail(403, "Forbidden");
    const rows = await q(`SELECT
      (SELECT count(*) FROM users) AS users,
      (SELECT count(*) FROM users WHERE is_disabled = false) AS active_users,
      (SELECT count(*) FROM posts WHERE kind = 'post') AS posts,
      (SELECT count(*) FROM posts WHERE kind = 'reel') AS reels,
      (SELECT count(*) FROM reports WHERE status = 'open') AS open_reports,
      (SELECT count(*) FROM stories WHERE expires_at > NOW()) AS live_stories,
      (SELECT count(*) FROM messages) AS messages`);
    const r = rows.rows[0];
    return NextResponse.json({
      users: num(r.users),
      activeUsers: num(r.active_users),
      posts: num(r.posts),
      reels: num(r.reels),
      openReports: num(r.open_reports),
      liveStories: num(r.live_stories),
      messages: num(r.messages)
    });
  });
}
