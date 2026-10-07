"use client";
import { useEffect, useState } from "react";
import { Guard, Shell, useApp } from "@/components/ui";
import { api } from "@/lib/client";
export default function Page() {
  const { me } = useApp();
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  async function load() {
    const [s, u, r, l] = await Promise.all([api("/api/admin/stats"), api("/api/admin/users"), api("/api/admin/reports"), api("/api/admin/logs")]);
    setStats(s); setUsers(u.users); setReports(r.reports); setLogs(l.logs);
  }
  useEffect(() => { if (me?.role === "admin") load().catch(() => undefined); }, [me]);
  return <Shell><Guard>{me?.role !== "admin" ? <p>هذه الصفحة للإدارة فقط.</p> : <div className="grid gap-4">
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{stats && Object.entries(stats).map(([k, v]) => <div key={k} className="panel rounded-3xl p-4"><p className="text-xs text-[var(--muted)]">{k}</p><p className="font-display text-3xl">{String(v)}</p></div>)}</div>
    <div className="panel rounded-[28px] p-4">{users.map((u) => <div key={u.id} className="flex items-center justify-between border-b border-black/5 py-2 text-sm"><span>@{u.username} · {u.id}</span><button onClick={() => api("/api/admin/users", { method: "POST", body: JSON.stringify({ userId: u.id, disabled: !u.is_disabled }) }).then(load)}>{u.is_disabled ? "تفعيل" : "تعطيل"}</button></div>)}</div>
    <div className="panel rounded-[28px] p-4">{reports.map((r) => <div key={r.id} className="mb-2 text-sm"><b>{r.status}</b> {r.target_type} {r.target_id} — {r.reason}
      <button className="ms-2 text-tide" onClick={() => api("/api/admin/reports", { method: "POST", body: JSON.stringify({ reportId: r.id, status: "actioned", hidePostId: r.target_type === "post" ? r.target_id : undefined }) }).then(load)}>إجراء</button>
      <button className="ms-2" onClick={() => api("/api/admin/reports", { method: "POST", body: JSON.stringify({ reportId: r.id, status: "dismissed" }) }).then(load)}>رفض</button>
    </div>)}</div>
    <div className="panel rounded-[28px] p-4 text-xs">{logs.map((l) => <p key={l.id}>{l.created_at} · @{l.username} · {l.action}</p>)}</div>
  </div>}</Guard></Shell>;
}
