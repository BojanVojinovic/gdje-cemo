"use client";

import { NoticeListSkeleton } from "@/components/skeletons";
import { Button, useToast } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { when } from "@/lib/hospitality";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const fields = [
  ["new_event", "Novi događaji"],
  ["event_updated", "Izmjene događaja"],
  ["event_cancelled", "Otkazani događaji"],
  ["new_post", "Nove objave"],
  ["new_promotion", "Promocije"],
  ["venue_announcement", "Obavještenja mjesta"],
  ["reservation_confirmed", "Potvrda rezervacije"],
  ["reservation_cancelled", "Otkaz rezervacije"],
  ["reservation_reminder", "Podsjetnici"],
  ["order_status_changed", "Status narudžbine"],
] as const;

type Preferences = Record<(typeof fields)[number][0], boolean>;
type Notice = { id: number; title: string; body: string; created_at: string; read_at: string | null };

export default function NotificationsPage() {
  const { token, user, ready } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [items, setItems] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    Promise.all([
      api<Preferences>("/me/notification-preferences", { token }).then((response) => setPreferences(response.data)),
      api<Notice[]>("/me/notifications", { token }).then((response) => setItems(response.data)),
    ]).catch(() => undefined).finally(() => setLoading(false));
  }, [token]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!token || !preferences) return;
    const response = await api<Preferences>("/me/notification-preferences", { method: "PUT", token, body: preferences });
    setPreferences(response.data);
    toast("Podešavanja obavještenja su sačuvana.");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <Link href="/profile" className="text-sm text-sea">Profil</Link>
      <h1 className="font-serif text-4xl">Obavještenja</h1>
      {loading ? <NoticeListSkeleton /> : null}
      {!loading && preferences ? (
        <form onSubmit={save} className="space-y-2 rounded-lg border border-line bg-paper p-4">
          {fields.map(([key, label]) => (
            <label key={key} className="flex min-h-11 items-center gap-2 text-sm">
              <input type="checkbox" checked={Boolean(preferences[key])} onChange={(event) => setPreferences({ ...preferences, [key]: event.target.checked })} />
              {label}
            </label>
          ))}
          <Button type="submit">Sačuvaj</Button>
        </form>
      ) : null}
      {!loading ? <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className={`border border-line bg-paper px-4 py-3 ${item.read_at ? "" : "border-l-4 border-l-sea"}`}>
            <p className="font-medium">{item.title}</p>
            <p className="text-sm">{item.body}</p>
            <p className="text-xs text-muted">{when(item.created_at)}{item.read_at ? "" : " · nepročitano"}</p>
            {!item.read_at ? (
              <button type="button" className="text-sm text-sea" onClick={async () => {
                if (!token) return;
                await api(`/me/notifications/${item.id}/read`, { method: "POST", token });
                setItems((current) => current.map((row) => row.id === item.id ? { ...row, read_at: new Date().toISOString() } : row));
              }}>Označi pročitano</button>
            ) : null}
          </li>
        ))}
      </ul> : null}
    </div>
  );
}
