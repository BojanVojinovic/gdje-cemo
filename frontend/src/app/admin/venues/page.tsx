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
    toast(t("admin.venueUpdated"));
    await load();
  }

  async function bulk(action: string) {
    if (!token || !selected.length || !window.confirm(t("admin.bulkAsk"))) return;
    await api("/admin/venues/bulk", { method: "POST", token, body: { action, ids: selected } });
    setSelected([]);
    await load();
  }

  return (
    <div className="space-y-4">
      <h1 className="font-serif text-4xl">{t("admin.venues")}</h1>
      <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); void load(); }}>
        <input className={inputClass} value={q} onChange={(event) => setQ(event.target.value)} placeholder={t("field.searchVenues")} />
        <Button type="submit" variant="secondary">{t("action.search")}</Button>
      </form>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => bulk("publish")}>{t("action.publish")}</Button>
        <Button variant="secondary" onClick={() => bulk("suspend")}>{t("admin.suspend")}</Button>
        <Button variant="secondary" onClick={() => bulk("feature")}>{t("admin.feature")}</Button>
        <Button variant="secondary" onClick={() => bulk("unfeature")}>{t("admin.unfeature")}</Button>
        <Button variant="secondary" onClick={() => bulk("verify")}>{t("admin.verify")}</Button>
      </div>
      {loading ? <TableListSkeleton /> : null}
      {!loading && venues.length === 0 ? <EmptyState title={t("admin.noVenues")} body={t("admin.noVenuesHint")} /> : null}
      {!loading ? <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-paper">
        {venues.map((venue) => (
          <li key={venue.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={selected.includes(venue.id)} onChange={() => setSelected((current) => current.includes(venue.id) ? current.filter((id) => id !== venue.id) : [...current, venue.id])} />
              <span><Link href={`/venue/${venue.slug}`} className="font-medium">{venue.name}</Link> · {venue.city} · {venue.status}{venue.is_featured ? ` · ${t("admin.featuredMark")}` : ""}</span>
            </label>
            <span className="flex gap-3">
              <button type="button" onClick={() => act(venue.id, { is_featured: !venue.is_featured })}>{venue.is_featured ? t("admin.unfeatureShort") : t("admin.feature")}</button>
              <button type="button" onClick={() => act(venue.id, { status: venue.status === "suspended" ? "published" : "suspended" }, t("admin.statusAsk"))}>{venue.status === "suspended" ? t("action.publish") : t("admin.suspend")}</button>
            </span>
          </li>
        ))}
      </ul> : null}
      {!loading && meta ? <p className="text-sm text-muted">{t("admin.venueCount", { n: meta.total })}</p> : null}
    </div>
  );
}
