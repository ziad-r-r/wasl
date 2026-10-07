export async function api<T = any>(path: string, opts: RequestInit = {}): Promise<T> {
  const headers = new Headers(opts.headers || {});
  if (opts.body && !(opts.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(path, { ...opts, headers, credentials: "same-origin" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data as T;
}

export function timeAgo(value: string, locale: string) {
  const diff = Date.now() - new Date(value).getTime();
  const min = Math.max(1, Math.round(diff / 60000));
  if (min < 60) return locale === "ar" ? `منذ ${min} د` : `${min}m`;
  const hr = Math.round(min / 60);
  if (hr < 24) return locale === "ar" ? `منذ ${hr} س` : `${hr}h`;
  const day = Math.round(hr / 24);
  return locale === "ar" ? `منذ ${day} ي` : `${day}d`;
}
