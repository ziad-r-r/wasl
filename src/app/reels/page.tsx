"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Guard, Shell } from "@/components/ui";
import { api } from "@/lib/client";
export default function Page() {
  const [reels, setReels] = useState<any[]>([]);
  const [muted, setMuted] = useState(true);
  useEffect(() => { api<{ reels: any[] }>("/api/reels").then((d) => setReels(d.reels)); }, []);
  return <Shell><Guard><div className="reel-snap mx-auto h-[78vh] max-w-md overflow-y-auto rounded-[28px]">
    {reels.map((reel) => {
      const media = reel.media[0];
      return <section key={reel.id} className="relative h-[78vh] bg-pine text-white">
        {media?.media_type === "video" ? <video src={media.url} className="h-full w-full object-cover" autoPlay muted={muted} loop playsInline /> : <img src={media?.url} alt="" className="h-full w-full object-cover" />}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 p-5">
          <Link href={`/u/${reel.author.username}`}>@{reel.author.username}</Link>
          <p className="mt-1 text-sm">{reel.caption}</p>
          <p className="text-xs opacity-80">{reel.viewCount} views · {reel.audioLabel}</p>
          <div className="mt-3 flex gap-3 text-sm">
            <button onClick={() => api(`/api/posts/${reel.id}/like`, { method: "POST" })}>إعجاب {reel.likeCount}</button>
            <Link href={`/p/${reel.id}`}>تعليق</Link>
            <button onClick={() => api(`/api/users/${reel.author.username}/follow`, { method: "POST" })}>متابعة</button>
            <button onClick={() => setMuted((m) => !m)}>{muted ? "صوت" : "كتم"}</button>
          </div>
        </div>
      </section>;
    })}
  </div></Guard></Shell>;
}
