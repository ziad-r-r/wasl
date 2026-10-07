"use client";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Guard, Shell, useApp } from "@/components/ui";
import { api } from "@/lib/client";
export default function Page() {
  const { id } = useParams<{ id: string }>();
  const { me, toast } = useApp();
  const [messages, setMessages] = useState<any[]>([]);
  const [reply, setReply] = useState<any>(null);
  const [typing, setTyping] = useState("");
  const box = useRef<HTMLDivElement>(null);
  async function load() { setMessages((await api<{ messages: any[] }>(`/api/conversations/${id}/messages`)).messages); }
  useEffect(() => { load(); const t = setInterval(load, 4000); return () => clearInterval(t); }, [id]);
  useEffect(() => { box.current?.scrollTo(0, box.current.scrollHeight); }, [messages]);
  useEffect(() => {
    let ws: WebSocket | null = null;
    let closed = false;
    api<{ token: string }>("/api/auth/socket").then((auth) => {
      if (closed || !auth.token) return;
      ws = new WebSocket(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`);
      ws.onopen = () => ws?.send(JSON.stringify({ type: "auth", token: auth.token }));
      ws.onmessage = (ev) => {
        const msg = JSON.parse(ev.data);
        if (msg.type === "message" && msg.conversationId === id) load();
        if (msg.type === "typing" && msg.conversationId === id) { setTyping("يكتب..."); setTimeout(() => setTyping(""), 1500); }
      };
    }).catch(() => undefined);
    return () => { closed = true; ws?.close(); };
  }, [id]);
  async function send(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    let mediaUrl, mediaType;
    const file = data.get("file");
    if (file instanceof File && file.size) {
      const body = new FormData();
      body.set("file", file);
      const uploaded = await api<{ url: string; mediaType: string }>("/api/upload", { method: "POST", body });
      mediaUrl = uploaded.url; mediaType = uploaded.mediaType;
    }
    await api(`/api/conversations/${id}/messages`, { method: "POST", body: JSON.stringify({ body: data.get("body") || "", mediaUrl, mediaType, replyToId: reply?.id }) });
    setReply(null); form.reset(); load();
  }
  return <Shell><Guard><div className="mx-auto flex h-[75vh] max-w-xl flex-col">
    <div ref={box} className="panel flex-1 space-y-2 overflow-y-auto rounded-[28px] p-4">
      {messages.map((m) => <div key={m.id} className={`max-w-[80%] rounded-2xl px-3 py-2 ${m.sender_id === me?.id ? "ms-auto bg-tide text-white" : "bg-black/5 dark:bg-white/10"}`}>
        <p className="text-xs opacity-70">@{m.username}</p>
        {m.deleted_at ? <i>حذفت الرسالة</i> : <>
          {m.media_url && m.media_type === "image" ? <img src={m.media_url} alt="" className="mt-1 max-h-48 rounded-xl" /> : null}
          {m.media_url && m.media_type === "video" ? <video src={m.media_url} controls className="mt-1 max-h-48" /> : null}
          {m.media_url && m.media_type === "audio" ? <audio src={m.media_url} controls /> : null}
          <p>{m.body}</p>
        </>}
        <div className="mt-1 flex gap-2 text-xs">
          {["👍", "❤️"].map((emoji) => <button key={emoji} onClick={() => api(`/api/conversations/${id}/reactions`, { method: "POST", body: JSON.stringify({ messageId: m.id, emoji }) }).then(load)}>{emoji}</button>)}
          <button onClick={() => setReply(m)}>رد</button>
          {m.sender_id === me?.id ? <button onClick={() => api(`/api/conversations/${id}/messages`, { method: "DELETE", body: JSON.stringify({ messageId: m.id }) }).then(load)}>حذف</button> : null}
        </div>
      </div>)}
    </div>
    <p className="h-5 text-xs text-[var(--muted)]">{typing}</p>
    {reply ? <p className="text-xs">ردًا على: {reply.body}</p> : null}
    <form onSubmit={send} className="mt-2 flex gap-2">
      <input name="body" className="flex-1 rounded-full border bg-transparent px-3 py-2" placeholder="رسالة" />
      <input name="file" type="file" accept="image/*,video/*,audio/*" className="max-w-28 text-xs" />
      <button className="rounded-full bg-tide px-4 text-white">إرسال</button>
    </form>
  </div></Guard></Shell>;
}
