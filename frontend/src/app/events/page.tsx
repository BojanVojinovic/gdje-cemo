"use client";

import { ComboBox } from "@/components/combo-box";
import { useI18n } from "@/components/i18n-provider";
import { EventFiltersSkeleton, EventGridSkeleton } from "@/components/skeletons";
import { Field, inputClass } from "@/components/ui";
import { api } from "@/lib/api";
import { when, type VenueContentItem } from "@/lib/hospitality";
import type { PageMeta, Venue } from "@/types";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function EventsPage() {
  const { t } = useI18n();
  const [items, setItems] = useState<VenueContentItem[]>([]);
  const [filters, setFilters] = useState({ city: "", category: "", date: "", price: "", sort: "date", venue: "" });
  const [cities, setCities] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [venues, setVenues] = useState<{ slug: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtersReady, setFiltersReady] = useState(false);

  useEffect(() => {
    api<string[]>("/cities").then((response) => setCities(response.data)).catch(() => undefined);
    api<Venue[]>("/venues?per_page=50").then((response) => {
      setVenues(response.data.map((venue) => ({ slug: venue.slug, name: venue.name })));
    }).catch(() => undefined);
    api<VenueContentItem[]>("/events?upcoming=1&sort=date").then(async (response) => {
      const rows = [...response.data];
      const last = (response.meta as PageMeta | undefined)?.last_page ?? 1;
      for (let page = 2; page <= last; page += 1) {
        const next = await api<VenueContentItem[]>(`/events?upcoming=1&sort=date&page=${page}`);
        rows.push(...next.data);
      }
      setCategories([...new Set(rows.map((item) => item.event_category).filter((item): item is string => Boolean(item)))]);
    }).catch(() => undefined).finally(() => setFiltersReady(true));
  }, []);

  useEffect(() => {
    let cancel = false;
    function queryFor(coords?: { latitude: number; longitude: number }) {
      const query = new URLSearchParams({ upcoming: "1", sort: filters.sort });
      if (filters.city) query.set("city", filters.city);
      if (filters.category) query.set("category", filters.category);
      if (filters.date) query.set("date", filters.date);
      if (filters.price) query.set("price", filters.price);
      if (filters.venue) query.set("venue", filters.venue);
      if (coords) {
        query.set("latitude", String(coords.latitude));
        query.set("longitude", String(coords.longitude));
      }
      return query;
    }
    function load(coords?: { latitude: number; longitude: number }) {
      setLoading(true);
      api<VenueContentItem[]>(`/events?${queryFor(coords).toString()}`).then((response) => {
        if (!cancel) setItems(response.data);
      }).catch(() => undefined).finally(() => {
        if (!cancel) setLoading(false);
      });
    }
    if (filters.sort === "proximity" && typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => load({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
        () => load(),
      );
    } else {
      load();
    }
    return () => { cancel = true; };
  }, [filters]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <h1 className="font-serif text-4xl">{t("events.title")}</h1>
      {filtersReady ? <form className="grid gap-3 sm:grid-cols-3" onSubmit={(event) => event.preventDefault()}>
        <Field label="Grad"><ComboBox value={filters.city} onChange={(value) => setFilters({ ...filters, city: value })} options={[{ value: "", label: "Svi" }, ...cities.map((city) => ({ value: city, label: city }))]} /></Field>
        <Field label="Kategorija"><ComboBox value={filters.category} onChange={(value) => setFilters({ ...filters, category: value })} options={[{ value: "", label: "Sve" }, ...categories.map((category) => ({ value: category, label: category }))]} /></Field>
        <Field label="Datum"><input type="date" className={inputClass} value={filters.date} onChange={(event) => setFilters({ ...filters, date: event.target.value })} /></Field>
        <Field label="Mjesto"><ComboBox value={filters.venue} onChange={(value) => setFilters({ ...filters, venue: value })} options={[{ value: "", label: "Sva mjesta" }, ...venues.map((venue) => ({ value: venue.slug, label: venue.name }))]} /></Field>
        <Field label="Cijena">
          <ComboBox value={filters.price} onChange={(value) => setFilters({ ...filters, price: value })} options={[
            { value: "", label: "Sve" },
            { value: "free", label: "Besplatno" },
            { value: "paid", label: "Plaćeno" },
          ]} />
        </Field>
        <Field label="Sortiranje">
          <ComboBox value={filters.sort} onChange={(value) => setFilters({ ...filters, sort: value })} options={[
            { value: "date", label: "Datum" },
            { value: "relevance", label: "Novije" },
            { value: "proximity", label: "Blizina" },
          ]} />
        </Field>
      </form> : <EventFiltersSkeleton />}
      {loading ? <EventGridSkeleton /> : null}
      {!loading && items.length === 0 ? <p className="text-sm text-muted">Nema objavljenih događaja za ove filtere.</p> : null}
      {!loading && items.length > 0 ? (
        <ul className="grid gap-5 sm:grid-cols-2">
          {items.map((item) => (
            <li key={item.id} className="overflow-hidden border border-line bg-paper shadow-[var(--shadow-card)]">
              <Link href={`/events/${item.slug}`} className="block">
                <div className="aspect-[16/10] bg-void">
                  {item.cover_url ? <img src={item.cover_url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-end p-4 font-serif text-3xl text-snow">{item.event_category || "Događaj"}</div>}
                </div>
                <div className="space-y-1 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sea">{when(item.event_start_at)} · {item.venue?.city}</p>
                  <h2 className="font-serif text-2xl">{item.title}</h2>
                  <p className="text-sm text-muted">{item.venue?.name} · {item.price ? `${item.price} €` : "Besplatno"}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
