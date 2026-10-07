"use client";

import Link from "next/link";
import { FormEvent, ReactNode, createContext, useContext, useEffect, useState } from "react";
import { Compass, Home, MessageCircle, Plus, Search, Clapperboard, Bell, Bookmark, Settings, Shield } from "lucide-react";
import { copy, Locale } from "@/lib/i18n";
import { api } from "@/lib/client";

export type Me = {
  id: string;
  username: string;
  display_name: string;
  role: string;
  avatar_url: string | null;
  unread: number;
  bio: string;
  website: string;
  cover_url: string | null;
  is_private: boolean;
  location: string;
  email: string;
};

type Toast = { id: number; text: string };

export function Providers({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>("ar");
  const [dark, setDark] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const [ready, setReady] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const storedLocale = (localStorage.getItem("wasl_locale") as Locale) || "ar";
    const storedDark = localStorage.getItem("wasl_theme") === "dark";
    setLocale(storedLocale);
    setDark(storedDark);
    document.documentElement.lang = storedLocale;
    document.documentElement.dir = storedLocale === "ar" ? "rtl" : "ltr";
    document.documentElement.classList.toggle("dark", storedDark);
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    api<{ user: Me | null }>("/api/auth/me").then((d) => setMe(d.user)).finally(() => setReady(true));
    const es = new EventSource("/api/realtime");
    es.addEventListener("unread", (ev) => {
      const n = Number(JSON.parse((ev as MessageEvent).data).n || 0);
      setMe((prev) => prev ? { ...prev, unread: n } : prev);
    });
    return () => es.close();
  }, []);

  function toast(text: string) {
    const item = { id: Date.now(), text };
    setToasts((t) => [...t, item]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== item.id)), 2800);
  }

  function switchLocale() {
    const next = locale === "ar" ? "en" : "ar";
    setLocale(next);
    localStorage.setItem("wasl_locale", next);
    document.documentElement.lang = next;
    document.documentElement.dir = next === "ar" ? "rtl" : "ltr";
  }
  function switchTheme() {
    const next = !dark;
    setDark(next);
    localStorage.setItem("wasl_theme", next ? "dark" : "light");
    document.documentElement.classList.toggle("dark", next);
  }

  const t = copy[locale];
  return (
    <AppContext.Provider value={{ locale, t, me, setMe, ready, toast, switchLocale, switchTheme, dark }}>
      {children}
      <div className="fixed bottom-20 left-4 z-50 flex flex-col gap-2 md:bottom-6">
        {toasts.map((item) => <div key={item.id} className="panel rounded-2xl px-4 py-2 text-sm shadow-card">{item.text}</div>)}
      </div>
    </AppContext.Provider>
  );
}

type Ctx = {
  locale: Locale;
  t: (typeof copy)["ar"];
  me: Me | null;
  setMe: (u: Me | null) => void;
  ready: boolean;
  toast: (s: string) => void;
  switchLocale: () => void;
  switchTheme: () => void;
  dark: boolean;
};
const AppContext = createContext<Ctx | null>(null);
export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("context");
  return ctx;
}

const links = [
  ["/", "home", Home],
  ["/explore", "explore", Compass],
  ["/search", "search", Search],
  ["/reels", "reels", Clapperboard],
  ["/messages", "messages", MessageCircle],
  ["/notifications", "notes", Bell],
  ["/saved", "saved", Bookmark],
  ["/create", "create", Plus]
] as const;

export function Shell({ children }: { children: ReactNode }) {
  const { t, me, switchLocale, switchTheme, locale } = useApp();
  return (
    <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 md:grid-cols-[92px_1fr] xl:grid-cols-[220px_1fr_280px]">
      <aside className="sticky top-0 z-20 hidden h-screen flex-col justify-between border-black/5 p-4 md:flex dark:border-white/10 md:border-e">
        <div>
          <Link href="/" className="mb-8 block font-display text-3xl text-tide">{t.brand}</Link>
          <nav className="flex flex-col gap-1">
            {links.map(([href, key, Icon]) => (
              <Link key={href} href={href} className="flex items-center gap-3 rounded-2xl px-3 py-2 text-sm hover:bg-tide/10">
                <Icon size={18} /> <span className="hidden xl:inline">{t[key]}</span>
                {key === "notes" && me && me.unread > 0 ? <b className="ms-auto rounded-full bg-coral px-2 text-xs text-white">{me.unread}</b> : null}
              </Link>
            ))}
            <Link href="/settings" className="flex items-center gap-3 rounded-2xl px-3 py-2 text-sm hover:bg-tide/10"><Settings size={18} /> <span className="hidden xl:inline">{t.settings}</span></Link>
            {me?.role === "admin" ? <Link href="/admin" className="flex items-center gap-3 rounded-2xl px-3 py-2 text-sm hover:bg-tide/10"><Shield size={18} /> <span className="hidden xl:inline">{t.admin}</span></Link> : null}
          </nav>
        </div>
        <div className="flex gap-2">
          <button className="rounded-full border border-black/10 px-3 py-1 text-xs dark:border-white/15" onClick={switchLocale}>{locale === "ar" ? "EN" : "ع"}</button>
          <button className="rounded-full border border-black/10 px-3 py-1 text-xs dark:border-white/15" onClick={switchTheme}>◐</button>
        </div>
      </aside>
      <main className="min-w-0 px-4 pb-24 pt-4 md:px-8">{children}</main>
      <aside className="sticky top-0 hidden h-screen p-6 xl:block">
        <div className="panel rounded-[28px] p-5 shadow-card">
          <p className="font-display text-2xl">{t.brand}</p>
          <p className="mt-2 text-sm text-[var(--muted)]">{t.tagline}</p>
          {me ? <Link href={`/u/${me.username}`} className="mt-4 block text-sm text-tide">@{me.username}</Link> : <Link href="/login" className="mt-4 block text-sm text-tide">{t.login}</Link>}
        </div>
      </aside>
      <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-black/10 bg-[var(--panel)] px-2 py-2 md:hidden">
        {links.slice(0, 5).map(([href, key, Icon]) => <Link key={href} href={href} aria-label={t[key]} className="rounded-2xl p-3"><Icon size={20} /></Link>)}
      </nav>
    </div>
  );
}

export function Avatar({ name, src, size = 40 }: { name: string; src?: string | null; size?: number }) {
  if (src) return <img src={src} alt="" className="rounded-full object-cover" style={{ width: size, height: size }} />;
  return <span className="grid place-items-center rounded-full bg-tide text-sm text-white" style={{ width: size, height: size }}>{name.slice(0, 1)}</span>;
}

export function PostCard({ post, onChange }: { post: any; onChange?: (p: any) => void }) {
  const { t, locale, toast } = useApp();
  const [index, setIndex] = useState(0);
  const media = post.media?.[index];
  async function act(path: string, patch: Record<string, unknown>) {
    const data = await api(path, { method: "POST" });
    onChange?.({ ...post, ...patch, ...data });
  }
  async function share() {
    const url = `${location.origin}/p/${post.id}`;
    await navigator.clipboard.writeText(url);
    toast(locale === "ar" ? "تم نسخ الرابط" : "Link copied");
  }
  return (
    <article className="panel overflow-hidden rounded-[28px] shadow-card">
      <header className="flex items-center gap-3 px-4 py-3">
        <Avatar name={post.author.displayName} src={post.author.avatarUrl} />
        <div className="min-w-0">
          <Link href={`/u/${post.author.username}`} className="font-medium">@{post.author.username}</Link>
          <p className="text-xs text-[var(--muted)]">{post.location} {post.suggested ? (locale === "ar" ? "· مقترح" : "· suggested") : ""}</p>
        </div>
        {post.isPinned ? <span className="ms-auto text-xs text-tide">{t.pin}</span> : null}
      </header>
      {post.caption ? <p className="px-4 pb-3 text-[15px] leading-7">{post.caption}</p> : null}
      {media ? (
        <div className="relative bg-pine/5">
          {media.media_type === "video" ? <video src={media.url} className="max-h-[640px] w-full bg-black object-contain" controls playsInline /> : <img src={media.url} alt="" className="max-h-[640px] w-full object-cover" />}
          {post.media.length > 1 ? <button className="absolute bottom-3 end-3 rounded-full bg-black/60 px-3 py-1 text-xs text-white" onClick={() => setIndex((i) => (i + 1) % post.media.length)}>{index + 1}/{post.media.length}</button> : null}
        </div>
      ) : null}
      <footer className="flex flex-wrap gap-2 px-4 py-3 text-sm">
        <button className={post.liked ? "text-coral" : ""} onClick={() => act(`/api/posts/${post.id}/like`, { liked: !post.liked, likeCount: post.likeCount + (post.liked ? -1 : 1) })}>{t.like} {post.likeCount}</button>
        <Link href={`/p/${post.id}`}>{t.comment} {post.commentCount}</Link>
        <button onClick={() => act(`/api/posts/${post.id}/save`, { saved: !post.saved })}>{post.saved ? "★" : "☆"} {t.save}</button>
        <button onClick={share}>{t.share}</button>
        <button onClick={() => api(`/api/posts/${post.id}/hide`, { method: "POST" }).then(() => onChange?.(null))}>{t.hide}</button>
        {post.kind === "reel" ? <span className="text-[var(--muted)]">{post.viewCount} views</span> : null}
      </footer>
    </article>
  );
}

export function Guard({ children }: { children: ReactNode }) {
  const { ready, me } = useApp();
  if (!ready) return <div className="skeleton h-40 rounded-[28px]" />;
  if (!me) return <AuthCard />;
  return <>{children}</>;
}

export function AuthCard() {
  const { t } = useApp();
  return (
    <div className="panel mx-auto mt-16 max-w-md rounded-[32px] p-8 text-center shadow-card">
      <p className="font-display text-4xl text-tide">{t.brand}</p>
      <p className="mt-2 text-sm text-[var(--muted)]">{t.tagline}</p>
      <div className="mt-6 flex justify-center gap-3">
        <Link className="rounded-full bg-tide px-5 py-2 text-white" href="/login">{t.login}</Link>
        <Link className="rounded-full border border-tide px-5 py-2" href="/register">{t.register}</Link>
      </div>
      <p className="mt-4 text-xs text-[var(--muted)]">{t.demo}</p>
    </div>
  );
}

export function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return <label className="block text-sm"><span className="mb-1 block text-[var(--muted)]">{label}</span><input {...props} className="w-full rounded-2xl border border-black/10 bg-transparent px-3 py-2 outline-none focus:border-tide dark:border-white/15" /></label>;
}

export function AuthForm({ mode }: { mode: "login" | "register" | "forgot" | "reset" }) {
  const { t, toast, locale } = useApp();
  const [error, setError] = useState("");
  const [devToken, setDevToken] = useState("");
  const [username, setUsername] = useState("");
  const [nameStatus, setNameStatus] = useState("");
  useEffect(() => {
    if (mode !== "register") return;
    const value = username.trim().toLowerCase();
    if (!value) { setNameStatus(""); return; }
    const timer = setTimeout(() => {
      api<{ available: boolean; valid: boolean }>(`/api/auth/username?u=${encodeURIComponent(value)}`)
        .then((res) => setNameStatus(!res.valid ? (locale === "ar" ? "حروف إنجليزية وأرقام فقط، من 3 إلى 20" : "3–20 letters, numbers, . or _") : res.available ? (locale === "ar" ? "اسم المستخدم متاح" : "Username is free") : (locale === "ar" ? "اسم المستخدم مستخدم" : "Username is taken")))
        .catch(() => setNameStatus(""));
    }, 250);
    return () => clearTimeout(timer);
  }, [username, mode, locale]);
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    try {
      if (mode === "login") {
        await api("/api/auth/login", { method: "POST", body: JSON.stringify({ identity: data.identity, password: data.password }) });
        location.href = "/";
      } else if (mode === "register") {
        const created = await api<{ id: string }>("/api/auth/register", { method: "POST", body: JSON.stringify({ displayName: data.displayName, username: data.username, password: data.password }) });
        toast(locale === "ar" ? `تم إنشاء الحساب. المعرّف: ${created.id}` : `Account created. Id: ${created.id}`);
        location.href = "/";
      } else if (mode === "forgot") {
        const res = await api<{ devToken?: string }>("/api/auth/forgot", { method: "POST", body: JSON.stringify({ username: data.username }) });
        setDevToken(res.devToken || "");
        toast(locale === "ar" ? "تم إصدار رمز الاستعادة" : "Reset token issued");
      } else {
        await api("/api/auth/reset", { method: "POST", body: JSON.stringify({ token: data.token, password: data.password }) });
        location.href = "/login";
      }
    } catch (err) {
      setError((err as Error).message);
    }
  }
  return (
    <form onSubmit={onSubmit} className="panel mx-auto mt-12 grid max-w-md gap-3 rounded-[32px] p-6 shadow-card">
      <h1 className="font-display text-4xl text-tide">{t.brand}</h1>
      <p className="text-sm text-[var(--muted)]">{mode === "register" ? (locale === "ar" ? "الاسم يظهر للجميع. اسم المستخدم فريد، والمعرّف يُنشأ للحساب." : "The name is public. The username is unique, and an id is created for the account.") : t.tagline}</p>
      {mode === "login" ? <Field label={t.username} name="identity" required autoComplete="username" /> : null}
      {mode === "register" ? <>
        <Field label={t.name} name="displayName" required minLength={2} maxLength={40} />
        <Field label={t.username} name="username" required pattern="[a-zA-Z0-9_.]{3,20}" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} />
        {nameStatus ? <p className="text-xs text-tide">{nameStatus}</p> : null}
      </> : null}
      {mode === "forgot" ? <Field label={t.username} name="username" required pattern="[a-zA-Z0-9_.]{3,20}" /> : null}
      {mode === "reset" ? <Field label="Token" name="token" required /> : null}
      {mode !== "forgot" ? <Field label={t.password} name="password" type="password" required minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} /> : null}
      {error ? <p className="text-sm text-coral">{error}</p> : null}
      {devToken ? <p className="break-all text-xs">dev token: {devToken}</p> : null}
      <button className="rounded-full bg-tide px-4 py-2 text-white">{mode === "login" ? t.login : mode === "register" ? t.register : t.publish}</button>
      {mode === "login" ? <p className="text-sm"><a href="/register">{t.register}</a> · <a href="/forgot">استعادة</a></p> : null}
      <p className="text-xs text-[var(--muted)]">{t.demo}</p>
    </form>
  );
}
