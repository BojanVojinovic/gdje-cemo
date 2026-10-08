"use client";

import { useI18n } from "@/components/i18n-provider";
import { TableListSkeleton } from "@/components/skeletons";
import { Button, EmptyState, inputClass, useToast } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { PageMeta, Venue } from "@/types";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function AdminVenuesPage() {
  const { token } = useAuth();
  const { t } = useI18n();
  const toast = useToast();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  async function load(query = q) {
    if (!token) return;
    setLoading(true);
    try {
      const response = await api<Venue[]>(`/admin/venues?q=${encodeURIComponent(query)}`, { token });
      setVenues(response.data);
      setMeta(response.meta ?? null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load("").catch(() => undefined); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  async function act(id: number, body: Record<string, unknown>, confirmText?: string) {
    if (!token) return;
    if (confirmText && !window.confirm(confirmText)) return;
    await api(`/admin/venues/${id}`, { method: "PUT", token, body });
    toast("Mjesto je ažurirano.");
    await load();
  }

  async function bulk(action: string) {
    if (!token || !selected.length || !window.confirm("Primijeniti radnju?")) return;
    await api("/admin/venues/bulk", { method: "POST", token, body: { action, ids: selected } });
    setSelected([]);
    await load();
  }

  return (
    <div className="space-y-4">
      <h1 className="font-serif text-4xl">Mjesta</h1>
      <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); void load(); }}>
        <input className={inputClass} value={q} onChange={(event) => setQ(event.target.value)} placeholder={t("field.searchVenues")} />
        <Button type="submit" variant="secondary">{t("action.search")}</Button>
      </form>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => bulk("publish")}>Objavi</Button>
        <Button variant="secondary" onClick={() => bulk("suspend")}>Suspenduj</Button>
        <Button variant="secondary" onClick={() => bulk("feature")}>Istakni</Button>
        <Button variant="secondary" onClick={() => bulk("unfeature")}>Skini isticanje</Button>
        <Button variant="secondary" onClick={() => bulk("verify")}>Potvrdi</Button>
      </div>
      {loading ? <TableListSkeleton /> : null}
      {!loading && venues.length === 0 ? <EmptyState title="Nema mjesta." body="Pretraga nema rezultata." /> : null}
      {!loading ? <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-paper">
        {venues.map((venue) => (
          <li key={venue.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={selected.includes(venue.id)} onChange={() => setSelected((current) => current.includes(venue.id) ? current.filter((id) => id !== venue.id) : [...current, venue.id])} />
              <span><Link href={`/venue/${venue.slug}`} className="font-medium">{venue.name}</Link> · {venue.city} · {venue.status}{venue.is_featured ? " · istaknuto" : ""}</span>
            </label>
            <span className="flex gap-3">
              <button type="button" onClick={() => act(venue.id, { is_featured: !venue.is_featured })}>{venue.is_featured ? "Skini" : "Istakni"}</button>
              <button type="button" onClick={() => act(venue.id, { status: venue.status === "suspended" ? "published" : "suspended" }, "Promijeniti status mjesta?")}>{venue.status === "suspended" ? "Objavi" : "Suspenduj"}</button>
            </span>
          </li>
        ))}
      </ul> : null}
      {!loading && meta ? <p className="text-sm text-muted">{meta.total} mjesta</p> : null}
    </div>
  );
}
