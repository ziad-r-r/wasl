"use client";
import { FormEvent, useEffect, useState } from "react";
import { Guard, Shell } from "@/components/ui";
import { api } from "@/lib/client";
export default function Page() {
  const [stories, setStories] = useState<any[]>([]);
  const [active, setActive] = useState<any>(null);
  const [reply, setReply] = useState("");
  async function load() { setStories((await api<{ stories: any[] }>("/api/stories")).stories); }
  useEffect(() => { load(); }, []);
  async function open(story: any) {
    setActive(story);
    const res = await api<{ views: number }>(`/api/stories/${story.id}/view`, { method: "POST" });
    setActive({ ...story, views: res.views, seen: true });
  }
  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const file = form.get("file");
    if (!(file instanceof File) || !file.size) return;
    const uploaded = await api<{ url: string; mediaType: string }>("/api/upload", { method: "POST", body: form });
    await api("/api/stories", { method: "POST", body: JSON.stringify({ mediaUrl: uploaded.url, mediaType: uploaded.mediaType === "video" ? "video" : "image", caption: String(form.get("caption") || "") }) });
    await load();
  }
  return <Shell><Guard>
    <form onSubmit={create} className="panel mb-4 grid gap-2 rounded-[28px] p-4">
      <input name="caption" placeholder="سطر على القصة" className="rounded-2xl border border-black/10 bg-transparent px-3 py-2 dark:border-white/15" />
      <input name="file" type="file" accept="image/*,video/*" required />
      <button className="rounded-full bg-tide px-4 py-2 text-white">نشر قصة ٢٤ ساعة</button>
    </form>
    <div className="flex gap-3 overflow-x-auto pb-3">
      {stories.map((s) => <button key={s.id} onClick={() => open(s)} className={`grid min-w-20 justify-items-center text-xs ${s.seen ? "opacity-60" : ""}`}><img src={s.avatar_url || s.media_url} alt="" className={`h-16 w-16 rounded-full object-cover ring-2 ${s.seen ? "ring-black/10" : "ring-coral"}`} /><span>@{s.username}</span></button>)}
    </div>
    {active ? <div className="panel mt-4 overflow-hidden rounded-[28px]">
      {active.media_type === "video" ? <video src={active.media_url} className="max-h-[70vh] w-full" autoPlay controls /> : <img src={active.media_url} alt="" className="max-h-[70vh] w-full object-cover" />}
      <div className="p-4">
        <p>{active.caption}</p>
        <p className="text-xs text-[var(--muted)]">{active.views || active.views} مشاهدة</p>
        <div className="mt-2 flex gap-2">
          <input value={reply} onChange={(e) => setReply(e.target.value)} className="flex-1 rounded-full border border-black/10 bg-transparent px-3 py-2 dark:border-white/15" placeholder="رد" />
          <button onClick={() => api(`/api/stories/${active.id}/reply`, { method: "POST", body: JSON.stringify({ body: reply }) }).then(() => setReply(""))}>إرسال</button>
          <button onClick={() => api(`/api/stories/${active.id}`, { method: "DELETE" }).then(load)}>حذف</button>
        </div>
      </div>
    </div> : null}
  </Guard></Shell>;
}
