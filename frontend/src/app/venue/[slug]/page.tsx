import { VenueMap } from "@/components/venue-map";
import { VenueGrid } from "@/components/venue-card";
import { Badge, Stars } from "@/components/ui";
import { SaveButton } from "@/components/save-button";
import { ReviewSection, ReportButton } from "@/components/review-section";
import { FollowButton } from "@/components/follow-button";
import { VenueHospitality } from "@/components/venue-hospitality";
import { Gallery } from "@/components/gallery";
import { api } from "@/lib/api";
import { brandButtonStyle } from "@/lib/brand";
import { formatPrice } from "@/lib/format";
import { normalizeLocale, translate } from "@/lib/i18n";
import type { VenueDetail } from "@/types";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ReserveLink } from "@/components/reserve-link";
import Link from "next/link";
import { cache } from "react";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

const loadVenue = cache(async (slug: string, locale: ReturnType<typeof normalizeLocale>) => {
  try {
    return (await api<VenueDetail>(`/venues/${slug}`, { locale })).data;
  } catch {
    return null;
  }
});

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const locale = normalizeLocale((await cookies()).get("gdje-locale")?.value);
  const detail = await loadVenue(slug, locale);
  if (!detail) return { title: translate(locale, "venue.notFound") };
  const venue = detail.venue;
  const description = venue.excerpt;
  const url = `/venue/${venue.slug}`;
  return {
    title: venue.name,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: venue.name,
      description,
      url,
      images: venue.cover_url ? [{ url: venue.cover_url }] : undefined,
      type: "website",
    },
  };
}

export default async function VenuePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = normalizeLocale((await cookies()).get("gdje-locale")?.value);
  const t = (key: string) => translate(locale, key);
  const detail = await loadVenue(slug, locale);
  if (!detail) notFound();
  const venue = detail.venue;
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: venue.name,
    description: venue.description,
    image: venue.cover_url,
    telephone: venue.phone,
    url: `${site}/venue/${venue.slug}`,
    address: {
      "@type": "PostalAddress",
      streetAddress: venue.address,
      addressLocality: venue.city,
      addressCountry: venue.country,
    },
    geo: { "@type": "GeoCoordinates", latitude: venue.latitude, longitude: venue.longitude },
    aggregateRating: venue.reviews_count
      ? { "@type": "AggregateRating", ratingValue: venue.rating_avg, reviewCount: venue.reviews_count }
      : undefined,
    servesCuisine: venue.category?.name,
    priceRange: venue.price_label,
  };

  return (
    <article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="relative h-[58vw] max-h-[560px] min-h-72 bg-void">
        {venue.cover_url ? (
          <img src={venue.cover_url} alt="" className="h-full w-full object-cover" />
        ) : null}
      </div>
      <div className="mx-auto max-w-6xl px-4">
        <div className="relative -mt-16 border border-line bg-paper p-5 shadow-[var(--shadow-card)] sm:-mt-20 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted" style={venue.brand_color ? { color: venue.brand_color } : undefined}>{venue.category?.label || venue.category?.name}{venue.subcategory ? ` · ${venue.subcategory.label || venue.subcategory.name}` : ""} · {venue.city}</p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-end gap-4">
              {venue.logo_url ? <img src={venue.logo_url} alt="" className="h-16 w-16 shrink-0 rounded-2xl border border-line bg-void object-contain p-1 sm:h-20 sm:w-20" /> : null}
              <div>
                <h1 className="font-serif text-4xl sm:text-6xl">{venue.name}</h1>
                {venue.tagline ? <p className="mt-2 max-w-xl text-lg text-muted">{venue.tagline}</p> : null}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <SaveButton venueId={venue.id} slug={venue.slug} />
              <FollowButton venueId={venue.id} />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
            <Stars value={venue.rating_avg} />
            <span className="font-semibold">{venue.rating_avg.toFixed(1)}</span>
            <span className="text-muted">{venue.reviews_count} {t("venue.reviews")}</span>
            <span>{venue.price_label}</span>
            <Badge tone={venue.is_open ? "open" : "closed"}>{venue.is_open ? t("venue.open") : t("venue.closed")}</Badge>
            {venue.verification_status === "verified" ? <Badge tone="verified">{t("venue.verified")}</Badge> : null}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <ReserveLink slug={venue.slug} style={brandButtonStyle(venue.brand_color, venue.brand_ink)} className="inline-flex min-h-11 items-center rounded-full bg-sea px-5 text-sm font-semibold text-snow">{t("venue.reserve")}</ReserveLink>
            {venue.offers_delivery ? <Link href={`/venue/${venue.slug}/deliver`} className="inline-flex min-h-11 items-center rounded-full border border-line px-5 text-sm font-semibold">{t("venue.orderDelivery")}</Link> : null}
            <a href="#meni" className="inline-flex min-h-11 items-center rounded-full border border-line px-5 text-sm font-semibold">{t("venue.menu")}</a>
          </div>
        </div>
      </div>
      <div className="fixed inset-x-0 bottom-14 z-20 flex gap-2 border-t border-line bg-paper p-3 md:hidden">
        <ReserveLink slug={venue.slug} style={brandButtonStyle(venue.brand_color, venue.brand_ink)} className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-sea text-sm font-semibold text-snow">{t("venue.reserveShort")}</ReserveLink>
        {venue.offers_delivery ? <Link href={`/venue/${venue.slug}/deliver`} className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-line text-sm font-semibold">{t("venue.orderDelivery")}</Link> : null}
        <a href="#meni" className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-line text-sm font-semibold">{t("venue.menu")}</a>
      </div>

      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1 space-y-10">
          <section>
            <h2 className="font-serif text-3xl">{t("venue.about")}</h2>
            <p className="mt-3 whitespace-pre-line text-base leading-7">{venue.description}</p>
          </section>
          {venue.images?.length ? <Gallery images={venue.images} /> : null}
          <section id="meni">
            <h2 className="font-serif text-3xl">{t("venue.menu")}</h2>
            {venue.menu?.categories?.length ? (
              <div className="mt-4">
                <nav aria-label={t("venue.menuCategories")} className="sticky top-[4.25rem] z-10 -mx-4 flex gap-2 overflow-x-auto bg-cream/95 px-4 py-3">
                  {venue.menu.categories.map((category) => (
                    <a key={category.id} href={`#meni-${category.id}`} className="shrink-0 border border-line bg-paper px-3 py-2 text-sm font-semibold">
                      {category.name}
                    </a>
                  ))}
                </nav>
                <div className="space-y-8">
                  {venue.menu.categories.map((category) => (
                    <div key={category.id} id={`meni-${category.id}`} className="scroll-mt-28">
                      <h3 className="border-b border-line pb-2 font-serif text-2xl">{category.name}</h3>
                      <ul>
                        {category.items?.map((item) => (
                          <li key={item.id} className="flex items-start gap-4 border-b border-line py-4">
                            {item.image_url ? <img src={item.image_url} alt="" className="h-16 w-16 shrink-0 object-cover" /> : null}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-baseline justify-between gap-4">
                                <p className={item.is_available ? "font-semibold" : "font-semibold text-muted line-through"}>{item.name}</p>
                                <p className="shrink-0 text-sm font-semibold">{formatPrice(Number(item.price))}</p>
                              </div>
                              {item.description ? <p className="mt-1 text-sm text-muted">{item.description}</p> : null}
                              {!item.is_available ? <p className="mt-1 text-xs text-coral">{t("venue.unavailable")}</p> : null}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted">{t("venue.menuEmpty")}</p>
            )}
          </section>
          <VenueHospitality venueId={venue.id} slug={venue.slug} />
          <ReviewSection venueId={venue.id} distribution={detail.rating_distribution} average={venue.rating_avg} count={venue.reviews_count} />
        </div>
        <aside className="w-full shrink-0 space-y-6 lg:w-80">
          <section className="rounded-lg border border-line bg-paper p-5">
            <h2 className="font-serif text-2xl">{t("venue.hours")}</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {venue.opening_hours?.map((day) => (
                <li key={day.day} className="flex justify-between gap-4">
                  <span>{t(`day.${day.day}`)}</span>
                  <span className="text-right text-muted">{day.closed ? t("venue.closedToday") : day.intervals.map((interval) => `${interval.opens_at}–${interval.closes_at}`).join(", ")}</span>
                </li>
              ))}
            </ul>
          </section>
          <section className="rounded-lg border border-line bg-paper p-5 text-sm">
            <h2 className="font-serif text-2xl">{t("venue.contact")}</h2>
            <p className="mt-3">{venue.address}, {venue.city}</p>
            {venue.phone ? <p className="mt-1"><a href={`tel:${venue.phone}`}>{venue.phone}</a></p> : null}
            {venue.website ? <p className="mt-1"><a href={venue.website} className="text-sea">{t("field.website")}</a></p> : null}
            <div className="mt-2 flex gap-3">
              {venue.socials.instagram ? <a href={venue.socials.instagram} className="text-sea">Instagram</a> : null}
              {venue.socials.facebook ? <a href={venue.socials.facebook} className="text-sea">Facebook</a> : null}
              {venue.socials.tiktok ? <a href={venue.socials.tiktok} className="text-sea">TikTok</a> : null}
            </div>
            {venue.amenities?.length ? (
              <ul className="mt-4 flex flex-wrap gap-2">
                {venue.amenities.map((amenity) => <li key={amenity.id}><Badge>{amenity.name}</Badge></li>)}
              </ul>
            ) : null}
            <div className="mt-4">
              <ReportButton type="venue" id={venue.id} />
            </div>
          </section>
          <VenueMap latitude={venue.latitude} longitude={venue.longitude} label={venue.name} />
        </aside>
      </div>
      {detail.similar.length ? (
        <section className="mx-auto max-w-6xl space-y-4 px-4 pb-12">
          <h2 className="font-serif text-3xl">{t("venue.similar")}</h2>
          <VenueGrid venues={detail.similar} />
        </section>
      ) : null}
    </article>
  );
}
