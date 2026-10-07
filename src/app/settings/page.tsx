"use client";
import { FormEvent, useEffect, useState } from "react";
import { Guard, Shell, useApp } from "@/components/ui";
import { api } from "@/lib/client";
export default function Page() {
  const { me, setMe, toast, switchLocale, switchTheme } = useApp();
  const [form, setForm] = useState<any>(null);
  useEffect(() => { if (me) setForm({ displayName: me.display_name, username: me.username, bio: me.bio || "", website: me.website || "", location: me.location || "", avatarUrl: me.avatar_url, coverUrl: me.cover_url, isPrivate: me.is_private }); }, [me]);
  async function save(e: FormEvent) {
    e.preventDefault();
    await api("/api/profile", { method: "PATCH", body: JSON.stringify(form) });
    toast("تم الحفظ");
    location.href = `/u/${form.username}`;
  }
  async function upload(kind: "avatarUrl" | "coverUrl", file: File) {
    const body = new FormData();
    body.set("file", file);
    const uploaded = await api<{ url: string }>("/api/upload", { method: "POST", body });
    setForm({ ...form, [kind]: uploaded.url });
  }
  async function password(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    await api("/api/auth/password", { method: "POST", body: JSON.stringify({ current: data.current, next: data.next }) });
    toast("تغيرت كلمة المرور");
  }
  if (!form) return <Shell><Guard><div className="skeleton h-40 rounded-3xl" /></Guard></Shell>;
  return <Shell><Guard><div className="mx-auto grid max-w-xl gap-4">
    <form onSubmit={save} className="panel grid gap-3 rounded-[28px] p-5">
      <p className="text-xs text-[var(--muted)]">معرّف الحساب: {me?.id}</p>
      <input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} className="rounded-2xl border bg-transparent px-3 py-2" />
      <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="rounded-2xl border bg-transparent px-3 py-2" />
      <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} className="rounded-2xl border bg-transparent px-3 py-2" />
      <input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="website" className="rounded-2xl border bg-transparent px-3 py-2" />
      <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="location" className="rounded-2xl border bg-transparent px-3 py-2" />
      <label className="text-sm">الصورة <input type="file" accept="image/*" onChange={(e) => e.target.files && upload("avatarUrl", e.target.files[0])} /></label>
      <label className="text-sm">الغلاف <input type="file" accept="image/*" onChange={(e) => e.target.files && upload("coverUrl", e.target.files[0])} /></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isPrivate} onChange={(e) => setForm({ ...form, isPrivate: e.target.checked })} /> حساب خاص</label>
      <button className="rounded-full bg-tide px-4 py-2 text-white">حفظ الملف</button>
    </form>
    <form onSubmit={password} className="panel grid gap-3 rounded-[28px] p-5">
      <input name="current" type="password" placeholder="الحالية" required className="rounded-2xl border bg-transparent px-3 py-2" />
      <input name="next" type="password" placeholder="الجديدة" required minLength={8} className="rounded-2xl border bg-transparent px-3 py-2" />
      <button className="rounded-full border px-4 py-2">تغيير كلمة المرور</button>
    </form>
    <div className="flex gap-2"><button onClick={switchLocale} className="rounded-full border px-4 py-2">العربية / English</button><button onClick={switchTheme} className="rounded-full border px-4 py-2">الوضع</button>
      <button onClick={() => api("/api/auth/logout", { method: "POST" }).then(() => { setMe(null); location.href = "/login"; })} className="rounded-full bg-coral px-4 py-2 text-white">خروج</button></div>
  </div></Guard></Shell>;
}
