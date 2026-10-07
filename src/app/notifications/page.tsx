"use client";
import { useEffect, useState } from "react";
import { Guard, Shell } from "@/components/ui";
import { api, timeAgo } from "@/lib/client";
import { useApp } from "@/components/ui";
export default function Page() {
  const { locale } = useApp();
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => { api<{ notifications: any[] }>("/api/notifications").then((d) => setItems(d.notifications)); }, []);
  return <Shell><Guard><div className="mx-auto max-w-xl">
    <button className="mb-3 text-sm text-tide" onClick={() => api("/api/notifications", { method: "POST" }).then(() => setItems((list) => list.map((n) => ({ ...n, is_read: true }))))}>تعليم الكل كمقروء</button>
    <div className="grid gap-2">{items.map((n) => <div key={n.id} className={`panel rounded-2xl p-3 ${n.is_read ? "opacity-70" : ""}`}><b>@{n.username}</b> · {n.type}<p className="text-sm">{n.body}</p><p className="text-xs text-[var(--muted)]">{timeAgo(n.created_at, locale)}</p></div>)}</div>
  </div></Guard></Shell>;
}
