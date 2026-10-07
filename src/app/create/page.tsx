"use client";
import { FormEvent, useState } from "react";
import { Guard, Shell, useApp } from "@/components/ui";
import { api } from "@/lib/client";
export default function Page() {
  const { toast } = useApp();
  const [busy, setBusy] = useState(false);
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const form = e.currentTarget;
    const data = new FormData(form);
    const files = (form.querySelector("input[type=file]") as HTMLInputElement).files;
    const media = [];
    if (files) {
      for (const file of Array.from(files)) {
        const body = new FormData();
        body.set("file", file);
        const uploaded = await api<{ url: string; mediaType: string }>("/api/upload", { method: "POST", body });
        media.push({ url: uploaded.url, mediaType: uploaded.mediaType === "video" ? "video" : "image" });
      }
    }
    const kind = String(data.get("kind"));
    const created = await api<{ id: string }>("/api/posts", { method: "POST", body: JSON.stringify({ caption: data.get("caption"), location: data.get("location"), kind, audioLabel: data.get("audio"), media }) });
    toast("تم النشر");
    location.href = `/p/${created.id}`;
  }
  return <Shell><Guard><form onSubmit={onSubmit} className="panel mx-auto grid max-w-xl gap-3 rounded-[28px] p-5">
    <textarea name="caption" required placeholder="الوصف، #وسم و @اسم" className="min-h-28 rounded-2xl border border-black/10 bg-transparent p-3 dark:border-white/15" />
    <input name="location" placeholder="المكان" className="rounded-2xl border border-black/10 bg-transparent px-3 py-2 dark:border-white/15" />
    <select name="kind" className="rounded-2xl border border-black/10 bg-transparent px-3 py-2 dark:border-white/15"><option value="post">منشور</option><option value="reel">لقطة</option></select>
    <input name="audio" placeholder="اسم الصوت للقطة" className="rounded-2xl border border-black/10 bg-transparent px-3 py-2 dark:border-white/15" />
    <input type="file" accept="image/*,video/*" multiple required />
    <button disabled={busy} className="rounded-full bg-tide px-4 py-2 text-white">{busy ? "..." : "نشر"}</button>
  </form></Guard></Shell>;
}
