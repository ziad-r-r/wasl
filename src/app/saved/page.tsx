"use client";
import { useEffect, useState } from "react";
import { Guard, PostCard, Shell } from "@/components/ui";
import { api } from "@/lib/client";
export default function Page() {
  const [posts, setPosts] = useState<any[]>([]);
  useEffect(() => { api<{ posts: any[] }>("/api/saved").then((d) => setPosts(d.posts)); }, []);
  return <Shell><Guard><div className="mx-auto grid max-w-xl gap-4">{posts.map((p) => <PostCard key={p.id} post={p} />)}{!posts.length ? <p className="panel rounded-[28px] p-8 text-center">لا محفوظات بعد.</p> : null}</div></Guard></Shell>;
}
