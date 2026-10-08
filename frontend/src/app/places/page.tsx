"use client";

import { ComboBox, type ComboOption } from "@/components/combo-box";
import { useI18n } from "@/components/i18n-provider";
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
  const { t } = useI18n();
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
    { value: "", label: t("field.all") },
    ...categories.flatMap((category) => [
      { value: category.slug, label: category.label || category.name },
      ...(category.children ?? []).map((child) => ({ value: child.slug, label: child.label || child.name, group: category.label || category.name })),
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
      <button type="button" className="min-h-9 rounded-full border border-line bg-paper px-3 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40" disabled={!filtersActive} onClick={() => { setFiltersOpen(false); router.push("/places"); }}>{t("places.reset")}</button>
      <FilterGroup label={t("action.search")}>
        <input className={inputClass} defaultValue={params.get("q") ?? ""} placeholder={t("field.searchPlaces")} onBlur={(event) => update({ q: event.target.value || null })} />
      </FilterGroup>
      <FilterGroup label={t("field.city")}>
        <ComboBox ariaLabel={t("field.city")} value={params.get("city") ?? ""} onChange={(value) => update({ city: value || null })} options={[{ value: "", label: t("field.all") }, ...cities.map((city) => ({ value: city, label: city }))]} />
      </FilterGroup>
      <FilterGroup label={t("field.category")}>
        <ComboBox ariaLabel={t("field.category")} value={params.get("category") ?? ""} onChange={(value) => update({ category: value || null })} options={categoryOptions} />
      </FilterGroup>
      <FilterGroup label={t("field.price")}>
        <ComboBox ariaLabel={t("field.price")} value={params.get("price_level") ?? ""} onChange={(value) => update({ price_level: value || null })} options={[
          { value: "", label: t("field.all") },
          { value: "1", label: "€" },
          { value: "2", label: "€€" },
          { value: "3", label: "€€€" },
          { value: "4", label: "€€€€" },
        ]} />
      </FilterGroup>
      <FilterGroup label={t("places.rating")}>
        <ComboBox ariaLabel={t("places.rating")} value={params.get("min_rating") ?? ""} onChange={(value) => update({ min_rating: value || null })} options={[
          { value: "", label: t("field.all") },
          { value: "3", label: "3+" },
          { value: "4", label: "4+" },
          { value: "4.5", label: "4.5+" },
        ]} />
      </FilterGroup>
      <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={params.get("open") === "1"} onChange={(event) => update({ open: event.target.checked ? "1" : null })} /> {t("places.openNow")}</label>
      <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={params.get("verified") === "1"} onChange={(event) => update({ verified: event.target.checked ? "1" : null })} /> {t("places.verifiedOnly")}</label>
      <FilterGroup label={t("field.amenities")}>
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
                {amenity.label || amenity.name}
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
        <Button variant="secondary" onClick={() => setFiltersOpen(true)}>{t("places.filters")}</Button>
      </div>
      {filtersOpen ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-paper px-4 py-4 lg:hidden">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-serif text-3xl">{t("places.filters")}</h2>
            <button type="button" className="min-h-11 px-2 text-sm text-muted" onClick={() => setFiltersOpen(false)}>{t("action.close")}</button>
          </div>
          {filterBody}
          <Button className="mt-6 w-full" onClick={() => setFiltersOpen(false)}>{t("places.show")}</Button>
        </div>
      ) : null}
      <aside className="hidden border border-line bg-paper p-4 lg:block">{filterBody}</aside>
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-serif text-4xl">{t("places.title")}</h1>
          <div className="w-full max-w-48">
            <ComboBox ariaLabel={t("places.sort")} value={params.get("sort") ?? "popular"} onChange={(value) => update({ sort: value })} options={[
              { value: "popular", label: t("places.popular") },
              { value: "rating", label: t("places.byRating") },
              { value: "reviews", label: t("places.reviewCount") },
              { value: "newest", label: t("places.newest") },
              { value: "name", label: t("places.byName") },
            ]} />
          </div>
        </div>
        {loading ? <VenueGridSkeleton /> : null}
        {error ? <p className="rounded-lg bg-paper p-6 text-coral">{error}</p> : null}
        {!loading && !error && venues.length === 0 ? (
          <EmptyState title={t("places.empty")} body={t("places.emptyHint")} />
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
