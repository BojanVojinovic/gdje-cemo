"use client";

import { VenueGrid } from "@/components/venue-card";
import { Button, EmptyState, Pagination, Skeleton, inputClass } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Amenity, Category, PageMeta, Venue } from "@/types";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

export default function PlacesPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-10"><Skeleton className="h-40" /></div>}>
      <PlacesExplorer />
    </Suspense>
  );
}

function PlacesExplorer() {
  const params = useSearchParams();
  const router = useRouter();
  const { token } = useAuth();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const query = params.toString();

  useEffect(() => {
    api<Category[]>("/categories").then((response) => setCategories(response.data)).catch(() => undefined);
    api<Amenity[]>("/amenities").then((response) => setAmenities(response.data)).catch(() => undefined);
    api<string[]>("/cities").then((response) => setCities(response.data)).catch(() => undefined);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api<Venue[]>(`/venues?${query}`, { token })
      .then((response) => {
        if (cancelled) return;
        setVenues(response.data);
        setMeta(response.meta ?? null);
        setError(null);
      })
      .catch((reason) => {
        if (!cancelled) setError(reason instanceof ApiError ? reason.message : "Pretraga nije uspjela.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [query, token]);

  function update(next: Record<string, string | null>) {
    const current = new URLSearchParams(params.toString());
    Object.entries(next).forEach(([key, value]) => {
      if (!value) current.delete(key);
      else current.set(key, value);
    });
    if (!("page" in next)) current.delete("page");
    router.push(`/places?${current.toString()}`);
  }

  const selectedAmenities = (params.get("amenities") ?? "").split(",").filter(Boolean);

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[260px_1fr]">
      <div className="lg:hidden">
        <Button variant="secondary" onClick={() => setFiltersOpen((value) => !value)}>{filtersOpen ? "Sakrij filtere" : "Filteri"}</Button>
      </div>
      <aside className={`${filtersOpen ? "block" : "hidden"} space-y-4 border border-line bg-paper p-4 lg:block`}>
        <FilterGroup label="Pretraga">
          <input className={inputClass} defaultValue={params.get("q") ?? ""} placeholder="Naziv ili adresa" onBlur={(event) => update({ q: event.target.value || null })} />
        </FilterGroup>
        <FilterGroup label="Grad">
          <select className={inputClass} value={params.get("city") ?? ""} onChange={(event) => update({ city: event.target.value || null })}>
            <option value="">Svi</option>
            {cities.map((city) => <option key={city}>{city}</option>)}
          </select>
        </FilterGroup>
        <FilterGroup label="Kategorija">
          <select className={inputClass} value={params.get("category") ?? ""} onChange={(event) => update({ category: event.target.value || null })}>
            <option value="">Sve</option>
            {categories.map((category) => (
              <optgroup key={category.id} label={category.name}>
                <option value={category.slug}>{category.name}</option>
                {category.children?.map((child) => <option key={child.id} value={child.slug}>{child.name}</option>)}
              </optgroup>
            ))}
          </select>
        </FilterGroup>
        <FilterGroup label="Cijena">
          <select className={inputClass} value={params.get("price_level") ?? ""} onChange={(event) => update({ price_level: event.target.value || null })}>
            <option value="">Sve</option>
            <option value="1">€</option>
            <option value="2">€€</option>
            <option value="3">€€€</option>
            <option value="4">€€€€</option>
          </select>
        </FilterGroup>
        <FilterGroup label="Ocjena">
          <select className={inputClass} value={params.get("min_rating") ?? ""} onChange={(event) => update({ min_rating: event.target.value || null })}>
            <option value="">Sve</option>
            <option value="3">3+</option>
            <option value="4">4+</option>
            <option value="4.5">4.5+</option>
          </select>
        </FilterGroup>
        <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={params.get("open") === "1"} onChange={(event) => update({ open: event.target.checked ? "1" : null })} /> Trenutno otvoreno</label>
        <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={params.get("verified") === "1"} onChange={(event) => update({ verified: event.target.checked ? "1" : null })} /> Samo provjerena</label>
        <FilterGroup label="Sadržaji">
          <div className="max-h-48 space-y-2 overflow-auto pr-1">
            {amenities.map((amenity) => {
              const active = selectedAmenities.includes(amenity.slug);
              return (
                <label key={amenity.id} className="flex min-h-8 items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => {
                      const next = active ? selectedAmenities.filter((slug) => slug !== amenity.slug) : [...selectedAmenities, amenity.slug];
                      update({ amenities: next.join(",") || null });
                    }}
                  />
                  {amenity.name}
                </label>
              );
            })}
          </div>
        </FilterGroup>
      </aside>
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-serif text-4xl">Mjesta</h1>
          <select className={inputClass + " max-w-48"} value={params.get("sort") ?? "popular"} onChange={(event) => update({ sort: event.target.value })} aria-label="Sortiranje">
            <option value="popular">Popularno</option>
            <option value="rating">Ocjena</option>
            <option value="reviews">Broj recenzija</option>
            <option value="newest">Najnovije</option>
            <option value="name">Naziv</option>
          </select>
        </div>
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-72" />
            <Skeleton className="h-72" />
          </div>
        ) : null}
        {error ? <p className="rounded-lg bg-paper p-6 text-coral">{error}</p> : null}
        {!loading && !error && venues.length === 0 ? (
          <EmptyState title="Nema mjesta za ovu pretragu." body="Promijenite grad, kategoriju ili ocjenu." action={<Button onClick={() => router.push("/places")}>Poništi filtere</Button>} />
        ) : null}
        {!loading && venues.length > 0 ? <VenueGrid venues={venues} /> : null}
        {meta ? <Pagination page={meta.current_page} lastPage={meta.last_page} onPage={(page) => update({ page: String(page) })} /> : null}
      </section>
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="font-medium">{label}</span>
      {children}
    </label>
  );
}
