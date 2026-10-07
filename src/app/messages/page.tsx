"use client";
import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { Guard, Shell } from "@/components/ui";
import { api } from "@/lib/client";
export default function Page() {
  const [items, setItems] = useState<any[]>([]);
  async function load() { setItems((await api<{ conversations: any[] }>("/api/conversations")).conversations); }
  useEffect(() => { load(); }, []);
  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const names = String(new FormData(e.currentTarget).get("names") || "").split(",").map((s) => s.trim()).filter(Boolean);
    const title = String(new FormData(e.currentTarget).get("title") || "");
    const created = await api<{ id: string }>("/api/conversations", { method: "POST", body: JSON.stringify({ usernames: names, title }) });
    location.href = `/messages/${created.id}`;
  }
  return <Shell><Guard><div className="mx-auto max-w-xl">
    <form onSubmit={create} className="panel mb-4 grid gap-2 rounded-[28px] p-4">
      <input name="names" placeholder="أسماء المستخدمين مفصولة بفاصلة" className="rounded-2xl border bg-transparent px-3 py-2" required />
      <input name="title" placeholder="عنوان المجموعة إن زاد العدد" className="rounded-2xl border bg-transparent px-3 py-2" />
      <button className="rounded-full bg-tide px-4 py-2 text-white">محادثة</button>
    </form>
    {items.map((c) => <Link key={c.id} href={`/messages/${c.id}`} className="panel mb-2 block rounded-2xl p-3"><b>{c.title || c.members.filter((m: any) => m).map((m: any) => m.username).join(", ")}</b><p className="text-sm text-[var(--muted)]">{c.last_body}</p>{Number(c.unread) ? <span className="text-xs text-coral">{c.unread}</span> : null}</Link>)}
  </div></Guard></Shell>;
}
