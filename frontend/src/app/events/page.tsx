"use client";

import { Field, inputClass } from "@/components/ui";
import { api } from "@/lib/api";
import { when, type VenueContentItem } from "@/lib/hospitality";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function EventsPage() {
  const [items, setItems] = useState<VenueContentItem[]>([]);
  const [filters, setFilters] = useState({ city: "", category: "", date: "", price: "", sort: "date", venue: "" });

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
      api<VenueContentItem[]>(`/events?${queryFor(coords).toString()}`).then((response) => {
        if (!cancel) setItems(response.data);
      }).catch(() => undefined);
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
      <h1 className="font-serif text-4xl">Događaji</h1>
      <form className="grid gap-3 sm:grid-cols-3" onSubmit={(event) => event.preventDefault()}>
        <Field label="Grad"><input className={inputClass} value={filters.city} onChange={(event) => setFilters({ ...filters, city: event.target.value })} /></Field>
        <Field label="Kategorija"><input className={inputClass} value={filters.category} onChange={(event) => setFilters({ ...filters, category: event.target.value })} /></Field>
        <Field label="Datum"><input type="date" className={inputClass} value={filters.date} onChange={(event) => setFilters({ ...filters, date: event.target.value })} /></Field>
        <Field label="Mjesto (slug)"><input className={inputClass} value={filters.venue} onChange={(event) => setFilters({ ...filters, venue: event.target.value })} /></Field>
        <Field label="Cijena">
          <select className={inputClass} value={filters.price} onChange={(event) => setFilters({ ...filters, price: event.target.value })}>
            <option value="">Sve</option>
            <option value="free">Besplatno</option>
            <option value="paid">Plaćeno</option>
          </select>
        </Field>
        <Field label="Sortiranje">
          <select className={inputClass} value={filters.sort} onChange={(event) => setFilters({ ...filters, sort: event.target.value })}>
            <option value="date">Datum</option>
            <option value="relevance">Novije</option>
            <option value="proximity">Blizina</option>
          </select>
        </Field>
      </form>
      {items.length === 0 ? <p className="text-sm text-muted">Nema objavljenih događaja za ove filtere.</p> : (
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
      )}
    </div>
  );
}
