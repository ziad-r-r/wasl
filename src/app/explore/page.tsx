"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Guard, Shell } from "@/components/ui";
import { api } from "@/lib/client";
export default function Page() {
  const [posts, setPosts] = useState<any[]>([]);
  useEffect(() => { api<{ posts: any[] }>("/api/explore").then((d) => setPosts(d.posts)); }, []);
  return <Shell><Guard><div className="grid grid-cols-2 gap-3 md:grid-cols-3">{posts.map((p) => <Link key={p.id} href={`/p/${p.id}`} className="panel overflow-hidden rounded-3xl">{p.media[0] ? <img src={p.media[0].url} alt="" className="aspect-square w-full object-cover" /> : null}<p className="p-3 text-sm">@{p.author.username}</p></Link>)}</div></Guard></Shell>;
}
