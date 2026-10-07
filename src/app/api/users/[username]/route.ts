import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { handle, fail } from "@/lib/http";
import { q } from "@/lib/db";
import { attachMedia, postSelect, shapePost } from "@/lib/social";
import { num } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { username: string } }) {
  return handle(req, async () => {
    const me = await requireUser();
    const users = await q(
      `SELECT u.id, u.username, u.is_disabled, p.display_name, p.bio, p.website, p.avatar_url, p.cover_url, p.is_private, p.location,
        (SELECT count(*) FROM follows f WHERE f.following_id = u.id AND f.status = 'active') AS followers,
        (SELECT count(*) FROM follows f WHERE f.follower_id = u.id AND f.status = 'active') AS following,
        EXISTS(SELECT 1 FROM follows f WHERE f.follower_id = $1 AND f.following_id = u.id AND f.status = 'active') AS followed,
        EXISTS(SELECT 1 FROM follows f WHERE f.follower_id = $1 AND f.following_id = u.id AND f.status = 'pending') AS requested,
        EXISTS(SELECT 1 FROM blocks b WHERE b.blocker_id = $1 AND b.blocked_id = u.id) AS blocked,
        EXISTS(SELECT 1 FROM mutes m WHERE m.muter_id = $1 AND m.muted_id = u.id) AS muted
       FROM users u JOIN profiles p ON p.user_id = u.id WHERE u.username = $2`,
      [me.id, params.username.toLowerCase()]
    );
    const profile = users.rows[0];
    if (!profile || profile.is_disabled) return fail(404, "User not found");
    const canSee = profile.id === me.id || !profile.is_private || profile.followed;
    let posts: unknown[] = [];
    if (canSee) {
      const tab = req.nextUrl.searchParams.get("tab") || "posts";
      const kind = tab === "reels" ? "reel" : "post";
      const rows = tab === "tagged"
        ? await q(`${postSelect} FROM mentions m JOIN posts p ON p.id = m.post_id JOIN users u ON u.id = p.author_id JOIN profiles pr ON pr.user_id = u.id WHERE m.user_id = $2 ORDER BY p.created_at DESC`, [me.id, profile.id])
        : await q(`${postSelect} FROM posts p JOIN users u ON u.id = p.author_id JOIN profiles pr ON pr.user_id = u.id WHERE p.author_id = $2 AND p.kind = $3 AND p.is_hidden = false ORDER BY p.is_pinned DESC, p.created_at DESC`, [me.id, profile.id, kind]);
      const media = await attachMedia(rows.rows.map((r) => r.id));
      posts = rows.rows.map((r) => shapePost(r, media.get(r.id) || []));
    }
    return NextResponse.json({
      profile: {
        id: profile.id,
        username: profile.username,
        displayName: profile.display_name,
        bio: profile.bio,
        website: profile.website,
        avatarUrl: profile.avatar_url,
        coverUrl: profile.cover_url,
        isPrivate: profile.is_private,
        location: profile.location,
        followers: num(profile.followers),
        following: num(profile.following),
        followed: !!profile.followed,
        requested: !!profile.requested,
        blocked: !!profile.blocked,
        muted: !!profile.muted,
        isMe: profile.id === me.id,
        canSee
      },
      posts
    });
  });
}
