import { NextRequest, NextResponse } from "next/server";

const hits = new Map<string, { n: number; t: number }>();

export function rateLimit(key: string, limit = 30, windowMs = 60_000) {
  const now = Date.now();
  const row = hits.get(key);
  if (!row || now - row.t > windowMs) {
    hits.set(key, { n: 1, t: now });
    return true;
  }
  row.n += 1;
  return row.n <= limit;
}

export function sameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (!origin) return true;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function fail(status: number, error: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error, ...extra }, { status });
}

export async function handle(req: NextRequest, fn: () => Promise<NextResponse>, limit = 60) {
  try {
    if (!["GET", "HEAD"].includes(req.method) && !sameOrigin(req)) return fail(403, "Cross-origin request blocked");
    const ip = req.headers.get("x-forwarded-for") || "local";
    if (!rateLimit(`${ip}:${req.nextUrl.pathname}`, limit)) return fail(429, "Too many requests");
    return await fn();
  } catch (error) {
    if (error instanceof ZodError) return fail(400, error.issues[0]?.message || "Invalid input");
    const status = (error as { status?: number }).status || 500;
    const message = status === 500 ? "Server error" : (error as Error).message;
    if (status === 500) console.error(error);
    return fail(status, message);
  }
}

export function num(value: unknown) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}
