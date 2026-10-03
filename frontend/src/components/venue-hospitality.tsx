"use client";

import { FloorCanvas, TableLegend } from "@/components/floor-canvas";
import { ReportButton } from "@/components/review-section";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { contentTypeLabel, seatsLabel, when, type FloorPlanPayload, type VenueContentItem } from "@/lib/hospitality";
import Link from "next/link";
import { useEffect, useState } from "react";

export function VenueHospitality({ venueId, slug }: { venueId: number; slug: string }) {
  const { user } = useAuth();
  const [plan, setPlan] = useState<FloorPlanPayload | null>(null);
  const [content, setContent] = useState<VenueContentItem[]>([]);

  useEffect(() => {
    api<FloorPlanPayload>(`/venues/${venueId}/floor-plan`).then((response) => setPlan(response.data)).catch(() => undefined);
    api<VenueContentItem[]>(`/venues/${venueId}/content`).then((response) => setContent(response.data)).catch(() => undefined);
  }, [venueId]);

  const events = content.filter((item) => item.type === "event");
  const posts = content.filter((item) => item.type === "post");
  const announcements = content.filter((item) => item.type === "announcement");
  const promotions = content.filter((item) => item.type === "promotion" || item.type === "special_offer");

  return (
    <div className="space-y-10">
      {plan && plan.tables.length ? (
        <section className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="font-serif text-3xl">Stolovi</h2>
            {plan.settings.enabled ? (
              <Link href={user ? `/venue/${slug}/reserve` : "/login"} className="inline-flex min-h-11 items-center rounded-full bg-sea px-4 text-sm font-semibold text-snow">Rezerviši sto</Link>
            ) : null}
          </div>
          <TableLegend />
          <FloorCanvas compact tables={plan.tables} width={plan.floor_plan.canvas_width} height={plan.floor_plan.canvas_height} backgroundUrl={plan.floor_plan.background_url} />
          <ul className="grid gap-2 sm:grid-cols-2">
            {plan.tables.map((table) => (
              <li key={table.id} className="border border-line bg-paper px-3 py-2 text-sm">
                <span className="font-medium">{table.name}</span>
                <span className="text-muted"> · {table.zone ?? "Bez zone"} · {seatsLabel(table.capacity_min, table.capacity_max)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {announcements.length ? <ContentBlock title="Obavještenja" items={announcements} /> : null}
      {promotions.length ? <ContentBlock title="Promocije" items={promotions} /> : null}
      {events.length ? <ContentBlock title="Događaji" items={events} linked /> : null}
      {posts.length ? <ContentBlock title="Objave" items={posts} /> : null}
    </div>
  );
}

function ContentBlock({ title, items, linked = false }: { title: string; items: VenueContentItem[]; linked?: boolean }) {
  return (
    <section className="space-y-3">
      <h2 className="font-serif text-3xl">{title}</h2>
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.id} className="border border-line bg-paper p-5">
            <p className="text-xs uppercase tracking-wide text-muted">{contentTypeLabel[item.type] ?? item.type}</p>
            {linked ? <Link href={`/events/${item.slug}`} className="font-serif text-2xl text-sea">{item.title}</Link> : <h3 className="font-serif text-2xl">{item.title}</h3>}
            {item.body ? <p className="mt-2 whitespace-pre-line text-sm leading-6">{item.body}</p> : null}
            {item.event_start_at ? <p className="mt-2 text-sm text-muted">{when(item.event_start_at)}{item.price ? ` · ${item.price} €` : " · Besplatno"}</p> : null}
            {item.daily_start ? <p className="mt-1 text-sm text-muted">{item.daily_start}–{item.daily_end}</p> : null}
            <div className="mt-2"><ReportButton type="venue_content" id={item.id} /></div>
          </li>
        ))}
      </ul>
    </section>
  );
}
