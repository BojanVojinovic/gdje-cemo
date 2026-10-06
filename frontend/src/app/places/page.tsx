"use client";

import { ComboBox, type ComboOption } from "@/components/combo-box";
import { VenueGrid } from "@/components/venue-card";
import { FilterPanelSkeleton, PlacesPageSkeleton, VenueGridSkeleton } from "@/components/skeletons";
import { Button, EmptyState, Pagination, inputClass } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Amenity, Category, PageMeta, Venue } from "@/types";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

export default function PlacesPage() {
  return (
    <Suspense fallback={<PlacesPageSkeleton />}>
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
  const [catalogsReady, setCatalogsReady] = useState(false);

  const query = params.toString();

  useEffect(() => {
    Promise.all([
      api<Category[]>("/categories").then((response) => setCategories(response.data)),
      api<Amenity[]>("/amenities").then((response) => setAmenities(response.data)),
      api<string[]>("/cities").then((response) => setCities(response.data)),
    ]).catch(() => undefined).finally(() => setCatalogsReady(true));
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
  const filtersActive = ["q", "city", "category", "price_level", "min_rating", "open", "verified", "amenities"].some((key) => params.get(key))
    || ((params.get("sort") ?? "popular") !== "popular");
  const categoryOptions: ComboOption[] = [
    { value: "", label: "Sve" },
    ...categories.flatMap((category) => [
      { value: category.slug, label: category.name },
      ...(category.children ?? []).map((child) => ({ value: child.slug, label: child.name, group: category.name })),
    ]),
  ];

  useEffect(() => {
    if (!filtersOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [filtersOpen]);

  const filterBody = !catalogsReady ? <FilterPanelSkeleton /> : (
    <div className="space-y-4">
      <button type="button" className="min-h-9 rounded-full border border-line bg-paper px-3 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40" disabled={!filtersActive} onClick={() => { setFiltersOpen(false); router.push("/places"); }}>Poništi filtere</button>
      <FilterGroup label="Pretraga">
        <input className={inputClass} defaultValue={params.get("q") ?? ""} placeholder="Naziv ili adresa" onBlur={(event) => update({ q: event.target.value || null })} />
      </FilterGroup>
      <FilterGroup label="Grad">
        <ComboBox ariaLabel="Grad" value={params.get("city") ?? ""} onChange={(value) => update({ city: value || null })} options={[{ value: "", label: "Svi" }, ...cities.map((city) => ({ value: city, label: city }))]} />
      </FilterGroup>
      <FilterGroup label="Kategorija">
        <ComboBox ariaLabel="Kategorija" value={params.get("category") ?? ""} onChange={(value) => update({ category: value || null })} options={categoryOptions} />
      </FilterGroup>
      <FilterGroup label="Cijena">
        <ComboBox ariaLabel="Cijena" value={params.get("price_level") ?? ""} onChange={(value) => update({ price_level: value || null })} options={[
          { value: "", label: "Sve" },
          { value: "1", label: "€" },
          { value: "2", label: "€€" },
          { value: "3", label: "€€€" },
          { value: "4", label: "€€€€" },
        ]} />
      </FilterGroup>
      <FilterGroup label="Ocjena">
        <ComboBox ariaLabel="Ocjena" value={params.get("min_rating") ?? ""} onChange={(value) => update({ min_rating: value || null })} options={[
          { value: "", label: "Sve" },
          { value: "3", label: "3+" },
          { value: "4", label: "4+" },
          { value: "4.5", label: "4.5+" },
        ]} />
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
    </div>
  );

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[260px_1fr]">
      <div className="lg:hidden">
        <Button variant="secondary" onClick={() => setFiltersOpen(true)}>Filteri</Button>
      </div>
      {filtersOpen ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-paper px-4 py-4 lg:hidden">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-serif text-3xl">Filteri</h2>
            <button type="button" className="min-h-11 px-2 text-sm text-muted" onClick={() => setFiltersOpen(false)}>Zatvori</button>
          </div>
          {filterBody}
          <Button className="mt-6 w-full" onClick={() => setFiltersOpen(false)}>Prikaži mjesta</Button>
        </div>
      ) : null}
      <aside className="hidden border border-line bg-paper p-4 lg:block">{filterBody}</aside>
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-serif text-4xl">Mjesta</h1>
          <div className="w-full max-w-48">
            <ComboBox ariaLabel="Sortiranje" value={params.get("sort") ?? "popular"} onChange={(value) => update({ sort: value })} options={[
              { value: "popular", label: "Popularno" },
              { value: "rating", label: "Ocjena" },
              { value: "reviews", label: "Broj recenzija" },
              { value: "newest", label: "Najnovije" },
              { value: "name", label: "Naziv" },
            ]} />
          </div>
        </div>
        {loading ? <VenueGridSkeleton /> : null}
        {error ? <p className="rounded-lg bg-paper p-6 text-coral">{error}</p> : null}
        {!loading && !error && venues.length === 0 ? (
          <EmptyState title="Nema mjesta za ovu pretragu." body="Promijenite grad, kategoriju ili ocjenu." />
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
