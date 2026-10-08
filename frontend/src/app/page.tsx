import { VenueGrid } from "@/components/venue-card";
import { api } from "@/lib/api";
import { normalizeLocale, translate } from "@/lib/i18n";
import type { HomePayload, Venue } from "@/types";
import type { VenueContentItem } from "@/lib/hospitality";
import { cookies } from "next/headers";
import Link from "next/link";
import { HomeSearch } from "@/components/home-search";
import { NearbyPlaces } from "@/components/nearby-places";
import { when } from "@/lib/hospitality";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const locale = normalizeLocale((await cookies()).get("gdje-locale")?.value);
  const t = (key: string) => translate(locale, key);
  let home: HomePayload | null = null;
  let events: VenueContentItem[] = [];
  let error = false;

  const [homeResult, eventsResult] = await Promise.all([
    api<HomePayload>("/home", { locale }).then((result) => result.data).catch(() => null),
    api<VenueContentItem[]>("/events?upcoming=1&sort=date", { locale }).then((result) => result.data.slice(0, 3)).catch(() => []),
  ]);
  home = homeResult;
  events = eventsResult;
  error = home === null;

  const hero = home?.featured[0];

  return (
    <div>
      <section className="tech-glow relative overflow-hidden border-b border-line bg-void text-ink">
        <div className="mx-auto grid max-w-6xl items-stretch gap-4 px-4 py-8 md:grid-cols-[0.92fr_1.08fr] md:py-12">
          <div className="flex min-h-80 flex-col justify-between rounded-[1.75rem] bg-gradient-to-br from-[#5b8cff] via-[#3b6cff] to-[#16348f] p-7 sm:p-10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/75">{t("home.country")}</p>
            <div>
              <h1 className="mt-8 max-w-md font-serif text-5xl leading-[0.95] text-white sm:text-6xl">
                {t("home.headline")}
              </h1>
              <p className="mt-5 max-w-xs text-xs font-semibold uppercase tracking-[0.16em] text-white/80">
                {locale === "en" ? t("home.tagline") : (home?.settings.tagline ?? t("home.tagline"))}
              </p>
            </div>
            <a href="#pretraga" className="mt-8 inline-flex w-fit items-center rounded-md bg-[#1e4ed8] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white">
              {t("home.search")}
            </a>
          </div>
          {hero?.cover_url || hero?.thumb_url ? (
            <Link href={`/venue/${hero.slug}`} className="relative block min-h-80 overflow-hidden rounded-[1.75rem] bg-black">
              <img src={hero.cover_url || hero.thumb_url || ""} alt="" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent px-6 pb-6 pt-16">
                <p className="text-[11px] uppercase tracking-[0.16em] text-white/70">{hero.city}</p>
                <p className="font-serif text-3xl leading-tight text-white">{hero.name}</p>
              </div>
            </Link>
          ) : (
            <div className="min-h-80 rounded-[1.75rem] bg-black" />
          )}
        </div>
        <p className="mx-auto max-w-6xl px-4 pb-8 font-serif text-3xl leading-tight text-ink sm:text-4xl">
          {t("home.line")}
        </p>
        <div id="pretraga" className="mx-auto max-w-6xl scroll-mt-24 px-4 pb-12">
          <HomeSearch cities={uniqueCities(home)} defaultCity={home?.settings.default_city ?? "Podgorica"} categories={home?.categories ?? []} />
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-16 px-4 py-12">
        {error ? (
          <p className="border border-line bg-paper p-6 text-sm">{t("home.unavailable")}</p>
        ) : null}

        <Section title={t("home.categories")} kicker={t("home.categoriesKicker")} all={t("home.all")}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(home?.categories ?? []).map((category) => (
              <Link key={category.id} href={`/places?category=${category.slug}`} className="rounded-2xl border border-line bg-paper px-4 py-5 transition hover:border-sea hover:bg-sea/10">
                <span className="block font-serif text-2xl">{category.label || category.name}</span>
              </Link>
            ))}
          </div>
        </Section>

        {home?.promotions?.length ? (
          <section className="grid gap-4 md:grid-cols-2">
            {home.promotions.map((promotion) => (
              <Link key={promotion.id} href={promotion.link_url || "/places"} className="relative min-h-44 overflow-hidden rounded-[1.25rem] bg-void text-ink">
                {promotion.image_url ? <img src={promotion.image_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" /> : null}
                <div className="relative p-6">
                  <p className="text-xs uppercase tracking-[0.16em] text-ink/70">{t("home.featuredPromo")}</p>
                  <h2 className="mt-2 font-serif text-3xl">{promotion.title}</h2>
                  {promotion.subtitle ? <p className="mt-2 max-w-md text-sm text-ink/80">{promotion.subtitle}</p> : null}
                </div>
              </Link>
            ))}
          </section>
        ) : null}

        <Section title={t("home.featured")} href="/places?sort=rating" kicker={t("home.featuredKicker")} all={t("home.all")}>
          <VenueGrid venues={home?.featured ?? []} featuredFirst />
        </Section>
        <Section title={t("home.popular")} href="/places?sort=popular" all={t("home.all")}>
          <VenueGrid venues={home?.popular ?? []} />
        </Section>
        {events.length ? (
          <Section title={t("home.events")} href="/events" kicker={t("home.eventsKicker")} all={t("home.all")}>
            <div className="grid gap-4 md:grid-cols-3">
              {events.map((event) => (
                <Link key={event.id} href={`/events/${event.slug}`} className="overflow-hidden rounded-[1.25rem] border border-line bg-paper">
                  <div className="aspect-[16/10] bg-void">
                    {event.cover_url ? <img src={event.cover_url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-end p-4 font-serif text-2xl text-ink">{event.event_category || t("home.eventFallback")}</div>}
                  </div>
                  <div className="space-y-1 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sea">{when(event.event_start_at)}</p>
                    <h3 className="font-serif text-2xl">{event.title}</h3>
                    <p className="text-sm text-muted">{event.venue?.name} · {event.price ? `${event.price} €` : t("home.free")}</p>
                  </div>
                </Link>
              ))}
            </div>
          </Section>
        ) : null}
        <Section title={t("home.top")} href="/places?sort=rating" all={t("home.all")}>
          <VenueGrid venues={home?.top_rated ?? []} />
        </Section>
        <NearbyPlaces initial={home?.nearby ?? []} />
      </div>
    </div>
  );
}

function Section({ title, href, kicker, all, children }: { title: string; href?: string; kicker?: string; all: string; children: React.ReactNode }) {
  return (
    <section className="space-y-5">
      <div className="flex items-end justify-between gap-4 border-b border-line pb-3">
        <div>
          {kicker ? <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{kicker}</p> : null}
          <h2 className="font-serif text-3xl sm:text-4xl">{title}</h2>
        </div>
        {href ? <Link href={href} className="text-sm font-semibold text-sea">{all}</Link> : null}
      </div>
      {children}
    </section>
  );
}

function uniqueCities(home: HomePayload | null) {
  const cities = new Set<string>();
  const lists = [home?.featured, home?.popular, home?.recent, home?.top_rated].filter(Boolean) as Venue[][];
  lists.flat().forEach((venue) => cities.add(venue.city));
  return [...cities].sort();
}
