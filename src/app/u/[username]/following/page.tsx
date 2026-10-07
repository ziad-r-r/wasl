"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Guard, Shell } from "@/components/ui";
import { api } from "@/lib/client";
export default function Page() {
  const { username } = useParams<{ username: string }>();
  const [users, setUsers] = useState<any[]>([]);
  useEffect(() => { api<{ users: any[] }>(`/api/users/${username}/following`).then((d) => setUsers(d.users)); }, [username]);
  return <Shell><Guard><div className="mx-auto grid max-w-md gap-2">{users.map((u) => <Link key={u.username} className="panel rounded-2xl p-3" href={`/u/${u.username}`}>@{u.username} · {u.display_name}</Link>)}</div></Guard></Shell>;
}
