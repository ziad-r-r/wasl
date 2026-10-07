import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { q } from "./db";
import { hashToken, id, token } from "./ids";
import { sessionMemory } from "./bus";

const COOKIE = "wasl_session";
const WEEK = 60 * 60 * 24 * 14;

export type SessionUser = {
  id: string;
  email: string;
  username: string;
  role: string;
  is_disabled: boolean;
  display_name: string;
  bio: string;
  website: string;
  avatar_url: string | null;
  cover_url: string | null;
  is_private: boolean;
  location: string;
};

export async function createSession(userId: string) {
  const raw = token();
  const expires = new Date(Date.now() + WEEK * 1000);
  await q(
    "INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES ($1,$2,$3,$4)",
    [id(), userId, hashToken(raw), expires.toISOString()]
  );
  cookies().set(COOKIE, raw, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires
  });
  sessionMemory.set(raw, userId);
  return raw;
}

export async function clearSession() {
  const raw = cookies().get(COOKIE)?.value;
  if (raw) {
    await q("DELETE FROM sessions WHERE token_hash = $1", [hashToken(raw)]);
    sessionMemory.delete(raw);
    cookies().set(COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  }
}

export async function getUser(): Promise<SessionUser | null> {
  const raw = cookies().get(COOKIE)?.value;
  if (!raw) return null;
  const rows = await q<SessionUser>(
    `SELECT u.id, u.email, u.username, u.role, u.is_disabled,
            p.display_name, p.bio, p.website, p.avatar_url, p.cover_url, p.is_private, p.location
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     JOIN profiles p ON p.user_id = u.id
     WHERE s.token_hash = $1 AND s.expires_at > NOW()`,
    [hashToken(raw)]
  );
  const user = rows.rows[0];
  if (!user || user.is_disabled) return null;
  sessionMemory.set(raw, user.id);
  await q(
    "INSERT INTO presence (user_id, last_seen) VALUES ($1, NOW()) ON CONFLICT (user_id) DO UPDATE SET last_seen = NOW()",
    [user.id]
  );
  return user;
}

export async function requireUser() {
  const user = await getUser();
  if (!user) {
    const err = new Error("Unauthorized");
    (err as Error & { status?: number }).status = 401;
    throw err;
  }
  return user;
}

export async function verifyPassword(hash: string, password: string) {
  return bcrypt.compare(password, hash);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}
