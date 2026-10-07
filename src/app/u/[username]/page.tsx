"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Avatar, Guard, Shell, useApp } from "@/components/ui";
import { api } from "@/lib/client";
export default function Page() {
  const { username } = useParams<{ username: string }>();
  const { toast } = useApp();
  const [tab, setTab] = useState("posts");
  const [data, setData] = useState<any>(null);
  async function load(next = tab) { setData(await api(`/api/users/${username}?tab=${next}`)); }
  useEffect(() => { load("posts"); }, [username]);
  if (!data) return <Shell><Guard><div className="skeleton h-60 rounded-[28px]" /></Guard></Shell>;
  const p = data.profile;
  return <Shell><Guard><div className="mx-auto max-w-3xl">
    <div className="panel overflow-hidden rounded-[32px]">
      <div className="h-36 bg-cover bg-center" style={{ backgroundImage: `url(${p.coverUrl || "/seed/coast.jpg"})` }} />
      <div className="flex flex-wrap items-end gap-4 p-5">
        <Avatar name={p.displayName} src={p.avatarUrl} size={84} />
        <div><h1 className="font-display text-3xl">{p.displayName}</h1><p>@{p.username}</p><p className="mt-1 max-w-md text-sm text-[var(--muted)]">{p.bio}</p>{p.website ? <a className="text-sm text-tide" href={p.website}>{p.website}</a> : null}</div>
        <div className="ms-auto flex gap-4 text-sm"><Link href={`/u/${p.username}/followers`}>{p.followers} متابع</Link><Link href={`/u/${p.username}/following`}>{p.following} يتابع</Link></div>
      </div>
      <div className="flex flex-wrap gap-2 px-5 pb-5">
        {!p.isMe ? <button className="rounded-full bg-tide px-4 py-2 text-white" onClick={() => api(`/api/users/${p.username}/follow`, { method: "POST" }).then(() => load())}>{p.followed ? "إلغاء المتابعة" : p.requested ? "مطلوب" : "متابعة"}</button> : <Link href="/settings" className="rounded-full border px-4 py-2">تعديل</Link>}
        {!p.isMe ? <button onClick={() => api(`/api/users/${p.username}/block`, { method: "POST" }).then(() => load())}>{p.blocked ? "إلغاء الحظر" : "حظر"}</button> : null}
        {!p.isMe ? <button onClick={() => api(`/api/users/${p.username}/mute`, { method: "POST" }).then(() => load())}>{p.muted ? "إلغاء الكتم" : "كتم"}</button> : null}
        {!p.isMe ? <button onClick={() => api("/api/reports", { method: "POST", body: JSON.stringify({ targetType: "user", targetId: p.id, reason: "profile report" }) }).then(() => toast("تم الإبلاغ"))}>إبلاغ</button> : null}
        {!p.isMe ? <button onClick={() => api("/api/conversations", { method: "POST", body: JSON.stringify({ usernames: [p.username] }) }).then((c) => location.href = `/messages/${c.id}`)}>رسالة</button> : null}
      </div>
    </div>
    <div className="mt-4 flex gap-2">{["posts", "reels", "tagged"].map((item) => <button key={item} className={`rounded-full px-4 py-1 ${tab === item ? "bg-tide text-white" : "border"}`} onClick={() => { setTab(item); load(item); }}>{item}</button>)}</div>
    {p.canSee ? <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">{data.posts.map((post: any) => <Link key={post.id} href={`/p/${post.id}`} className="panel overflow-hidden rounded-3xl">{post.media[0] ? <img src={post.media[0].url} className="aspect-square w-full object-cover" alt="" /> : null}{post.isPinned ? <span className="block p-2 text-xs">مثبت</span> : null}</Link>)}</div> : <p className="panel mt-4 rounded-3xl p-6">هذا الحساب خاص.</p>}
  </div></Guard></Shell>;
}
