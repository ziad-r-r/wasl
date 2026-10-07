import { q } from "./db";
import { id } from "./ids";
import { publish } from "./bus";
import { num } from "./http";

export async function notify(userId: string, actorId: string, type: string, entityType: string, entityId: string, body: string) {
  if (userId === actorId) return;
  const nid = id();
  await q(
    "INSERT INTO notifications (id, user_id, actor_id, type, entity_type, entity_id, body) VALUES ($1,$2,$3,$4,$5,$6,$7)",
    [nid, userId, actorId, type, entityType, entityId, body]
  );
  publish({ type: "notification", userId, notificationId: nid, kind: type, body });
}

export async function logAction(actorId: string | null, action: string, meta: Record<string, unknown>) {
  await q("INSERT INTO audit_logs (id, actor_id, action, meta) VALUES ($1,$2,$3,$4)", [
    id(),
    actorId,
    action,
    JSON.stringify(meta)
  ]);
}

export async function attachMedia(postIds: string[]) {
  if (!postIds.length) return new Map<string, Array<{ id: string; url: string; media_type: string }>>();
  const rows = await q(
    `SELECT id, post_id, url, media_type, sort_order FROM post_media WHERE post_id = ANY($1::text[]) ORDER BY sort_order`,
    [postIds]
  );
  const map = new Map<string, Array<{ id: string; url: string; media_type: string }>>();
  for (const row of rows.rows) {
    const list = map.get(row.post_id) || [];
    list.push({ id: row.id, url: row.url, media_type: row.media_type });
    map.set(row.post_id, list);
  }
  return map;
}

function flag(value: unknown) {
  return value === true || value === "t" || value === "true" || value === 1;
}

export function shapePost(row: Record<string, any>, media: Array<{ id: string; url: string; media_type: string }> = []) {
  return {
    id: row.id,
    caption: row.caption,
    location: row.location,
    kind: row.kind,
    isPinned: flag(row.is_pinned),
    viewCount: num(row.view_count),
    createdAt: row.created_at,
    author: {
      id: row.author_id,
      username: row.username,
      displayName: row.display_name,
      avatarUrl: row.avatar_url
    },
    media,
    likeCount: num(row.like_count),
    commentCount: num(row.comment_count),
    liked: flag(row.liked),
    saved: flag(row.saved),
    following: flag(row.following),
    suggested: !flag(row.following)
  };
}

export const postSelect = `
  SELECT p.*, u.username, pr.display_name, pr.avatar_url,
    (SELECT count(*) FROM likes l WHERE l.post_id = p.id) AS like_count,
    (SELECT count(*) FROM comments c WHERE c.post_id = p.id) AS comment_count,
    EXISTS(SELECT 1 FROM likes l WHERE l.post_id = p.id AND l.user_id = $1) AS liked,
    EXISTS(SELECT 1 FROM saved_posts s WHERE s.post_id = p.id AND s.user_id = $1) AS saved,
    EXISTS(SELECT 1 FROM follows f WHERE f.follower_id = $1 AND f.following_id = p.author_id AND f.status = 'active') AS following
`;

export async function syncTags(postId: string, caption: string, actorId: string) {
  const tags = Array.from(caption.matchAll(/#([\p{L}\p{N}_]+)/gu)).map((m) => m[1].toLowerCase());
  await q("DELETE FROM post_hashtags WHERE post_id = $1", [postId]);
  for (const tag of Array.from(new Set(tags))) {
    await q("INSERT INTO hashtags (id, tag) VALUES ($1,$2) ON CONFLICT (tag) DO NOTHING", [id(), tag]);
    const found = await q<{ id: string }>("SELECT id FROM hashtags WHERE tag = $1", [tag]);
    await q("INSERT INTO post_hashtags (post_id, hashtag_id) VALUES ($1,$2) ON CONFLICT DO NOTHING", [postId, found.rows[0].id]);
  }
  const mentions = Array.from(caption.matchAll(/@([a-zA-Z0-9_.]+)/g)).map((m) => m[1].toLowerCase());
  await q("DELETE FROM mentions WHERE post_id = $1", [postId]);
  for (const username of Array.from(new Set(mentions))) {
    const users = await q<{ id: string }>("SELECT id FROM users WHERE lower(username) = $1", [username]);
    if (!users.rows[0]) continue;
    await q("INSERT INTO mentions (id, post_id, user_id) VALUES ($1,$2,$3)", [id(), postId, users.rows[0].id]);
    await notify(users.rows[0].id, actorId, "mention", "post", postId, "mentioned you");
  }
}
