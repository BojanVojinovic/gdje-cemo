"use client";

import { useI18n } from "@/components/i18n-provider";

type Point = {
  date: string;
  reservations: number;
  orders: number;
  deliveries: number;
  profile_views: number;
  menu_views: number;
  signups?: number;
};

export type AnalyticsPayload = {
  range_days: number;
  from: string;
  to: string;
  period: Record<string, number>;
  previous: Record<string, number>;
  lifetime?: Record<string, number>;
  series: Point[];
  top_items: { name: string; quantity: number; revenue: number }[];
  reservations_by_status: Record<string, number>;
  orders_by_status: Record<string, number>;
  deliveries_by_status: Record<string, number>;
  busiest_weekdays?: { reservations: number; orders: number }[];
  venues?: { id: number; name: string; city: string; status: string; rating_avg: number; profile_views: number }[];
  platform?: Record<string, number>;
  top_venues?: { id: number; name: string; city: string; profile_views: number; rating_avg: number; reviews_count: number }[];
  signups_by_role?: Record<string, number>;
};

export function AnalyticsBoard({
  data,
  days,
  onDays,
  venueId,
  venues,
  onVenue,
}: {
  data: AnalyticsPayload;
  days: number;
  onDays: (days: number) => void;
  venueId?: string;
  venues?: { id: number; name: string }[];
  onVenue?: (id: string) => void;
}) {
  const { t } = useI18n();
  const cards: [string, number, number][] = [
    [t("dash.reservations"), data.period.reservations ?? 0, data.previous.reservations ?? 0],
    [t("dash.covers"), data.period.covers ?? 0, data.previous.covers ?? 0],
    [t("dash.orders"), data.period.orders ?? 0, data.previous.orders ?? 0],
    [t("dash.deliveries"), data.period.deliveries ?? 0, data.previous.deliveries ?? 0],
    [t("dash.revenue"), data.period.delivery_revenue ?? 0, data.previous.delivery_revenue ?? 0],
    [t("dash.reviews"), data.period.reviews ?? 0, data.previous.reviews ?? 0],
    [t("dash.favorites"), data.period.favorites ?? 0, data.previous.favorites ?? 0],
    [t("dash.eventSignups"), data.period.event_signups ?? 0, data.previous.event_signups ?? 0],
    [t("dash.views"), data.period.profile_views ?? 0, data.previous.profile_views ?? 0],
  ];
  const names = t("shift.weekdays").split(",");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{data.from} – {data.to}</p>
          <h1 className="font-serif text-4xl">{t("dash.title")}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {venues && onVenue ? (
            <select className="min-h-11 rounded-full border border-line bg-paper px-3 text-sm" value={venueId ?? ""} onChange={(event) => onVenue(event.target.value)}>
              <option value="">{t("dash.allVenues")}</option>
              {venues.map((venue) => <option key={venue.id} value={venue.id}>{venue.name}</option>)}
            </select>
          ) : null}
          {[7, 30, 90].map((value) => (
            <button key={value} type="button" className={`min-h-11 rounded-full px-4 text-sm font-semibold ${days === value ? "bg-sea text-snow" : "border border-line"}`} onClick={() => onDays(value)}>
              {value} {t("dash.days")}
            </button>
          ))}
        </div>
      </div>

      {data.platform ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label={t("dash.users")} value={data.platform.users} hint={`+${data.platform.new_users} ${t("dash.signups")}`} />
          <Stat label={t("dash.businesses")} value={data.platform.businesses} hint={`${data.platform.pending_businesses} ${t("dash.pending")}`} />
          <Stat label={t("dash.published")} value={data.platform.published_venues} hint={`${data.platform.venues} ${t("dash.venues")}`} />
          <Stat label={t("dash.reports")} value={data.platform.pending_reports} />
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(([label, value, previous]) => (
          <Stat key={label} label={label} value={value} hint={`${change(value, previous)} ${t("dash.vs")}`} />
        ))}
      </div>

      {data.lifetime ? (
        <p className="text-sm text-muted">
          {t("dash.lifetime")}: {t("dash.views")} {data.lifetime.profile_views} · {t("dash.menuViews")} {data.lifetime.menu_views} · {data.lifetime.rating_avg}
        </p>
      ) : null}

      <section className="border border-line bg-paper p-4">
        <h2 className="font-serif text-2xl">{t("dash.series")}</h2>
        <Bars series={data.series} />
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted">
          <span className="text-sea">{t("dash.reservations")}</span>
          <span>{t("dash.orders")}</span>
          <span>{t("dash.deliveries")}</span>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="border border-line bg-paper p-4">
          <h2 className="font-serif text-2xl">{t("dash.topItems")}</h2>
          {data.top_items.length === 0 ? <p className="mt-3 text-sm text-muted">{t("dash.empty")}</p> : (
            <ul className="mt-3 space-y-2 text-sm">
              {data.top_items.map((item) => (
                <li key={item.name} className="flex justify-between gap-3">
                  <span>{item.name}</span>
                  <span className="text-muted">{item.quantity} · {item.revenue} €</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="border border-line bg-paper p-4">
          <h2 className="font-serif text-2xl">{t("dash.weekdays")}</h2>
          <ul className="mt-3 space-y-1 text-sm">
            {(data.busiest_weekdays ?? []).map((day, index) => (
              <li key={index} className="flex justify-between">
                <span>{names[index] ?? index}</span>
                <span className="text-muted">{day.reservations} / {day.orders}</span>
              </li>
            ))}
          </ul>
          <StatusList title={t("dash.reservations")} rows={data.reservations_by_status} />
          <StatusList title={t("dash.orders")} rows={data.orders_by_status} />
          <StatusList title={t("dash.deliveries")} rows={data.deliveries_by_status} />
        </section>
      </div>

      {data.signups_by_role ? (
        <section className="border border-line bg-paper p-4">
          <h2 className="font-serif text-2xl">{t("dash.signups")}</h2>
          <StatusList title={t("dash.users")} rows={data.signups_by_role} />
        </section>
      ) : null}

      {data.top_venues?.length ? (
        <section className="border border-line bg-paper p-4">
          <h2 className="font-serif text-2xl">{t("dash.topVenues")}</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {data.top_venues.map((venue) => (
              <li key={venue.id} className="flex justify-between gap-3">
                <span>{venue.name} · {venue.city}</span>
                <span className="text-muted">{venue.profile_views} · {venue.rating_avg}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="border border-line bg-paper p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="mt-2 font-serif text-4xl">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

function StatusList({ title, rows }: { title: string; rows: Record<string, number> }) {
  const entries = Object.entries(rows);
  if (!entries.length) return null;
  return (
    <div className="mt-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{title}</p>
      <ul className="mt-2 space-y-1 text-sm">
        {entries.map(([status, count]) => (
          <li key={status} className="flex justify-between"><span>{status}</span><span>{count}</span></li>
        ))}
      </ul>
    </div>
  );
}

function Bars({ series }: { series: Point[] }) {
  const max = Math.max(1, ...series.map((point) => point.reservations + point.orders + point.deliveries));
  return (
    <div className="mt-4 flex h-32 items-end gap-px" aria-hidden="true">
      {series.map((point) => (
        <div key={point.date} className="flex h-full flex-1 items-end" title={`${point.date}: ${point.reservations}/${point.orders}/${point.deliveries}`}>
          <div className="w-full bg-sea/80" style={{ height: `${((point.reservations + point.orders + point.deliveries) / max) * 100}%` }} />
        </div>
      ))}
    </div>
  );
}

function change(current: number, previous: number): string {
  if (previous === 0) return current === 0 ? "0%" : "+100%";
  const percent = Math.round(((current - previous) / previous) * 100);
  return `${percent > 0 ? "+" : ""}${percent}%`;
}
