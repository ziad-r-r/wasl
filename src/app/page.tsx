"use client";
import { useEffect, useState } from "react";
import { Guard, PostCard, Shell } from "@/components/ui";
import { api } from "@/lib/client";

export default function FeedPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);

  async function load(next = 0) {
    setLoading(true);
    const data = await api<{ posts: any[] }>(`/api/feed?offset=${next}`);
    setPosts((prev) => next === 0 ? data.posts : [...prev, ...data.posts]);
    setOffset(next + data.posts.length);
    setDone(data.posts.length < 8);
    setLoading(false);
  }
  useEffect(() => { load(0).catch(() => setLoading(false)); }, []);

  return (
    <Shell>
      <Guard>
        <div className="mx-auto grid max-w-xl gap-5">
          {posts.map((post) => post ? <PostCard key={post.id} post={post} onChange={(next) => setPosts((list) => next ? list.map((p) => p.id === post.id ? next : p) : list.filter((p) => p.id !== post.id))} /> : null)}
          {loading ? <div className="skeleton h-80 rounded-[28px]" /> : null}
          {!loading && !posts.length ? <p className="panel rounded-[28px] p-8 text-center">لا توجد لحظات بعد. تابع حسابًا أو انشر واحدة.</p> : null}
          {!done && !loading ? <button className="rounded-full border border-tide px-4 py-2" onClick={() => load(offset)}>المزيد</button> : null}
        </div>
      </Guard>
    </Shell>
  );
}
