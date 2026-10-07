"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Guard, Shell } from "@/components/ui";
import { api } from "@/lib/client";
export default function Page() {
  const [q, setQ] = useState("");
  const [data, setData] = useState<any>({ users: [], posts: [], tags: [] });
  useEffect(() => {
    const t = setTimeout(() => api(`/api/search?q=${encodeURIComponent(q)}`).then(setData), 200);
    return () => clearTimeout(t);
  }, [q]);
  return <Shell><Guard><div className="mx-auto max-w-xl">
    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="اسم، وسم، أو جملة" className="w-full rounded-full border border-black/10 bg-transparent px-4 py-3 dark:border-white/15" />
    <div className="mt-4 grid gap-3">
      {data.users?.map((u: any) => <Link key={u.username} href={`/u/${u.username}`} className="panel rounded-2xl p-3">@{u.username} · {u.display_name}<p className="text-sm text-[var(--muted)]">{u.bio}</p></Link>)}
      {data.tags?.map((t: any) => <button key={t.tag} className="text-start text-tide" onClick={() => setQ(t.tag)}>#{t.tag}</button>)}
      {data.posts?.map((p: any) => <Link key={p.id} href={`/p/${p.id}`} className="panel rounded-2xl p-3 text-sm">{p.caption}</Link>)}
    </div>
  </div></Guard></Shell>;
}
