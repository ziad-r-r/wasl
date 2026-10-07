"use client";
import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Guard, PostCard, Shell, useApp } from "@/components/ui";
import { api } from "@/lib/client";
export default function Page() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useApp();
  const [data, setData] = useState<any>(null);
  const [replyTo, setReplyTo] = useState<string | undefined>();
  async function load() { setData(await api(`/api/posts/${id}`)); }
  useEffect(() => { load().catch(() => setData(null)); }, [id]);
  async function comment(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const body = String(new FormData(e.currentTarget).get("body") || "");
    await api(`/api/posts/${id}/comments`, { method: "POST", body: JSON.stringify({ body, parentId: replyTo }) });
    e.currentTarget.reset();
    setReplyTo(undefined);
    load();
  }
  return <Shell><Guard>{data ? <div className="mx-auto grid max-w-xl gap-4">
    <PostCard post={data.post} onChange={(next) => setData({ ...data, post: next })} />
    <div className="panel rounded-[28px] p-4">
      {data.comments.map((c: any) => <div key={c.id} className={`mb-3 ${c.parent_id ? "ms-6" : ""}`}><b>@{c.username}</b> {c.body}<button className="ms-2 text-xs text-tide" onClick={() => setReplyTo(c.id)}>رد</button></div>)}
      <form onSubmit={comment} className="mt-3 flex gap-2"><input name="body" required className="flex-1 rounded-full border border-black/10 bg-transparent px-3 py-2 dark:border-white/15" placeholder={replyTo ? "رد" : "تعليق"} /><button className="rounded-full bg-tide px-4 text-white">إرسال</button></form>
      <div className="mt-3 flex gap-2 text-sm">
        <button onClick={() => api(`/api/posts/${id}/pin`, { method: "POST" }).then(load)}>تثبيت</button>
        <button onClick={() => api("/api/reports", { method: "POST", body: JSON.stringify({ targetType: "post", targetId: id, reason: "needs review" }) }).then(() => toast("تم الإبلاغ"))}>إبلاغ</button>
        <button onClick={() => api(`/api/posts/${id}`, { method: "DELETE" }).then(() => location.href = "/")}>حذف</button>
      </div>
    </div>
  </div> : <p>غير موجود</p>}</Guard></Shell>;
}
