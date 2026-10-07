import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { id } from "./ids";

export type Row = Record<string, any>;

interface Runner {
  query<T = Row>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
}

let ready: Promise<Runner> | null = null;

export function db() {
  if (!ready) ready = boot();
  return ready;
}

async function boot(): Promise<Runner> {
  const schema = fs.readFileSync(path.join(process.cwd(), "db/schema.sql"), "utf8");
  if (process.env.DATABASE_URL) {
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    await pool.query(schema);
    const runner: Runner = { query: (sql, params) => pool.query(sql, params as any[]) };
    await seed(runner);
    return runner;
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const dir = process.env.VERCEL ? path.join("/tmp", "wasl-data") : path.join(process.cwd(), ".data");
  fs.mkdirSync(dir, { recursive: true });
  const pg = new PGlite(dir);
  await pg.exec(schema);
  const runner: Runner = {
    query: async (sql, params) => {
      const res = await pg.query(sql, params as any[]);
      return { rows: (res.rows || []) as Row[] };
    }
  };
  await seed(runner);
  return runner;
}

async function seed(runner: Runner) {
  const existing = await runner.query<{ count: string | number }>("SELECT count(*)::int AS count FROM users");
  if (Number(existing.rows[0]?.count || 0) > 0) return;
  const password = await bcrypt.hash("WaslDemo!2026", 10);
  const people = [
    ["layla", "ليلى ناصر", "أدوّن الضوء، المائدة، والطريق. القاهرة.", "القاهرة"],
    ["omar", "Omar Haddad", "Coast paths, night markets, quiet notes.", "Alexandria"],
    ["nour", "نور فؤاد", "مطبخ صغير ووصفات بلا عجلة.", "الإسكندرية"],
    ["admin", "Wasl Desk", "Moderation desk.", "Remote"]
  ] as const;
  const ids: Record<string, string> = {};
  for (const [username, name, bio, location] of people) {
    const uid = id();
    ids[username] = uid;
    await runner.query(
      "INSERT INTO users (id, username, password_hash, role) VALUES ($1,$2,$3,$4)",
      [uid, username, password, username === "admin" ? "admin" : "user"]
    );
    await runner.query(
      "INSERT INTO profiles (user_id, display_name, bio, location, website) VALUES ($1,$2,$3,$4,$5)",
      [uid, name, bio, location, username === "layla" ? "https://wasl.app" : ""]
    );
  }
  const pairs: Array<[string, string]> = [["layla", "omar"], ["layla", "nour"], ["omar", "layla"], ["nour", "layla"], ["omar", "nour"]];
  for (const [a, b] of pairs) {
    await runner.query(
      "INSERT INTO follows (follower_id, following_id, status) VALUES ($1,$2,'active')",
      [ids[a], ids[b]]
    );
  }
  const samples = [
    ["layla", "post", "صباح هادئ قبل أن يبدأ اليوم. #قهوة #يوميات", "الزمالك", ["/seed/coffee.jpg"], "image"],
    ["omar", "post", "The path keeps the light longer than the city. #coast #walk", "North coast", ["/seed/coast.jpg"], "image"],
    ["nour", "post", "ريحان وليمون على اللوح. الوصفة في التعليقات. #مطبخ", "الإسكندرية", ["/seed/herbs.jpg"], "image"],
    ["omar", "reel", "فوانيس السوق بعد العشاء. #ليل #سوق", "السوق", ["/seed/lanterns.jpg"], "image"]
  ] as const;
  for (const [username, kind, caption, location, media, mediaType] of samples) {
    const pid = id();
    await runner.query(
      "INSERT INTO posts (id, author_id, caption, location, kind, view_count, created_at) VALUES ($1,$2,$3,$4,$5,$6, NOW() - interval '2 hours')",
      [pid, ids[username], caption, location, kind, kind === "reel" ? 128 : 24]
    );
    await runner.query(
      "INSERT INTO post_media (id, post_id, url, media_type, sort_order) VALUES ($1,$2,$3,$4,0)",
      [id(), pid, media[0], mediaType]
    );
    if (kind === "reel") {
      await runner.query("INSERT INTO reels (id, post_id, duration_sec, audio_label) VALUES ($1,$2,$3,$4)", [id(), pid, 8, "market hush"]);
    }
    const tags = Array.from(caption.matchAll(/#([\p{L}\p{N}_]+)/gu)).map((m) => m[1].toLowerCase());
    for (const tag of tags) {
      const hid = id();
      await runner.query(
        "INSERT INTO hashtags (id, tag) VALUES ($1,$2) ON CONFLICT (tag) DO NOTHING",
        [hid, tag]
      );
      const found = await runner.query<{ id: string }>("SELECT id FROM hashtags WHERE tag = $1", [tag]);
      await runner.query(
        "INSERT INTO post_hashtags (post_id, hashtag_id) VALUES ($1,$2) ON CONFLICT DO NOTHING",
        [pid, found.rows[0].id]
      );
    }
  }
  const sid = id();
  await runner.query(
    "INSERT INTO stories (id, author_id, media_url, media_type, caption, expires_at) VALUES ($1,$2,$3,'image',$4, NOW() + interval '20 hours')",
    [sid, ids.layla, "/seed/coffee.jpg", "لسه القهوة سخنة"]
  );
  const cid = id();
  await runner.query("INSERT INTO conversations (id, title, is_group) VALUES ($1,$2,false)", [cid, ""]);
  await runner.query("INSERT INTO conversation_members (conversation_id, user_id) VALUES ($1,$2), ($1,$3)", [cid, ids.layla, ids.omar]);
  await runner.query(
    "INSERT INTO messages (id, conversation_id, sender_id, body) VALUES ($1,$2,$3,$4)",
    [id(), cid, ids.omar, "The coast path is open after five."]
  );
  await runner.query(
    "INSERT INTO audit_logs (id, actor_id, action, meta) VALUES ($1,$2,$3,$4)",
    [id(), ids.admin, "seed", "{\"note\":\"initial demo data\"}"]
  );
}

export async function q<T = Row>(sql: string, params: unknown[] = []) {
  const runner = await db();
  return runner.query<T>(sql, params);
}
