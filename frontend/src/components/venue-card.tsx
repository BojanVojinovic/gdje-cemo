"use client";

import { useI18n } from "@/components/i18n-provider";
import { Badge } from "@/components/ui";
import type { Venue } from "@/types";
import Image from "next/image";
import Link from "next/link";

export function VenueCard({ venue, featured = false }: { venue: Venue; featured?: boolean }) {
  const { t } = useI18n();
  return (
    <article className={`group overflow-hidden rounded-[1.25rem] border border-line bg-paper shadow-[var(--shadow-card)] ${featured ? "sm:col-span-2" : ""}`}>
      <Link href={`/venue/${venue.slug}`} className="block">
        <div className={`relative bg-void ${featured ? "aspect-[16/10]" : "aspect-[4/3]"}`}>
          {venue.thumb_url || venue.cover_url ? (
            <Image src={(venue.thumb_url || venue.cover_url) as string} alt="" fill className="object-cover transition duration-500 group-hover:scale-[1.03]" sizes={featured ? "(min-width: 1024px) 60vw, 100vw" : "(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw"} />
          ) : (
            <div className="flex h-full items-end p-4 font-serif text-3xl text-ink">{venue.name}</div>
          )}
          <div className="absolute left-3 top-3">
            <Badge tone={venue.is_open ? "open" : "closed"}>{venue.is_open ? t("venue.open") : t("venue.closed")}</Badge>
          </div>
          {venue.logo_url ? <img src={venue.logo_url} alt="" className="absolute bottom-3 left-3 h-11 w-11 rounded-xl border border-line bg-paper object-contain p-0.5" /> : null}
          <div className="absolute bottom-3 right-3 bg-paper px-2 py-1 text-sm font-semibold text-ink">
            {venue.rating_avg.toFixed(1)}
            <span className="ml-1 text-xs font-normal text-muted">({venue.reviews_count})</span>
          </div>
        </div>
        <div className="space-y-1.5 p-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-serif text-[1.35rem] leading-tight">{venue.name}</h3>
            <span className="shrink-0 text-sm text-muted">{venue.price_label}</span>
          </div>
          <p className="text-sm text-muted">
            {venue.category?.label || venue.category?.name}
            {venue.subcategory ? ` · ${venue.subcategory.label || venue.subcategory.name}` : ""}
          </p>
          <p className="text-sm">
            {venue.city}
            {venue.distance_km != null ? <span className="text-muted"> · {venue.distance_km} km</span> : null}
          </p>
        </div>
      </Link>
    </article>
  );
}

export function VenueGrid({ venues, featuredFirst = false }: { venues: Venue[]; featuredFirst?: boolean }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {venues.map((venue, index) => (
        <VenueCard key={venue.id} venue={venue} featured={featuredFirst && index === 0} />
      ))}
    </div>
  );
}
