"use client";

import { ReportButton } from "@/components/review-section";
import { EventDetailSkeleton } from "@/components/skeletons";
import { Button, useToast } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { when, type VenueContentItem } from "@/lib/hospitality";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type EventPayload = {
  event: VenueContentItem;
  registered: number;
  is_registered: boolean;
  spots_remaining: number | null;
  related: VenueContentItem[];
};

export default function EventPage() {
  const params = useParams<{ slug: string }>();
  const { token, user, ready } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [payload, setPayload] = useState<EventPayload | null>(null);
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!ready) return;
    let cancel = false;
    setMissing(false);
    setPayload(null);
    api<EventPayload>(`/events/${params.slug}`, { token })
      .then((response) => {
        if (!cancel) setPayload(response.data);
      })
      .catch(() => {
        if (!cancel) setMissing(true);
      });
    return () => {
      cancel = true;
    };
  }, [params.slug, token, ready]);

  if (missing) return <p className="mx-auto max-w-3xl px-4 py-10 text-sm text-muted">Događaj nije javan ili ne postoji.</p>;
  if (!payload) return <EventDetailSkeleton />;
  const event = payload.event;

  async function register(cancel = false) {
    if (!user || !token) {
      router.push("/login");
      return;
    }
    setBusy(true);
    try {
      await api(`/content/${event.id}/register`, { method: cancel ? "DELETE" : "POST", token });
      toast(cancel ? "Prijava je otkazana." : "Prijava je sačuvana.");
      const fresh = await api<EventPayload>(`/events/${params.slug}`, { token });
      setPayload(fresh.data);
    } catch (reason) {
      toast(reason instanceof ApiError ? (reason.errors?.event?.[0] || reason.message) : "Prijava nije sačuvana.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article>
      {event.cover_url ? (
        <div className="h-[46vw] max-h-[480px] min-h-56 bg-void">
          <img src={event.cover_url} alt="" className="h-full w-full object-cover" />
        </div>
      ) : null}
      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-8 lg:grid-cols-[1.4fr_0.7fr]">
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{event.event_category || "Događaj"}</p>
          <h1 className="font-serif text-4xl sm:text-6xl">{event.title}</h1>
          {event.body ? <p className="whitespace-pre-line text-base leading-7">{event.body}</p> : null}
          <ReportButton type="venue_content" id={event.id} />
        </div>
        <aside className="h-fit space-y-3 border border-line bg-paper p-5">
          {event.venue ? <Link href={`/venue/${event.venue.slug}`} className="font-semibold text-sea">{event.venue.name}</Link> : null}
          <p>{event.venue?.city}</p>
          <p>{when(event.event_start_at)}{event.event_end_at ? ` – ${when(event.event_end_at)}` : ""}</p>
          <p className="font-semibold">{event.price ? `${event.price} €` : "Besplatno"}</p>
          {event.organizer ? <p className="text-sm text-muted">{event.organizer}</p> : null}
          {event.capacity ? <p className="text-sm">{payload.registered} prijavljenih · {payload.spots_remaining} slobodnih mjesta</p> : null}
          {user && event.registration_mode !== "none" && event.registration_mode !== "table_reservation" ? (
            <Button onClick={() => void register(payload.is_registered)} loading={busy}>
              {payload.is_registered ? "Odjavi se" : "Prijavi se"}
            </Button>
          ) : null}
          {event.registration_mode === "none" ? <p className="text-sm text-muted">Prijava nije potrebna.</p> : null}
          {event.registration_mode === "table_reservation" && event.venue ? (
            <Link href={user ? `/venue/${event.venue.slug}/reserve` : "/login"} className="text-sm font-semibold text-sea">Rezervišite sto</Link>
          ) : null}
        </aside>
      </div>
      {payload.related.length ? (
        <section className="mx-auto max-w-5xl space-y-3 px-4 pb-12">
          <h2 className="font-serif text-3xl">Slični događaji</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {payload.related.map((item) => (
              <li key={item.id} className="border border-line bg-paper p-4">
                <Link href={`/events/${item.slug}`} className="font-serif text-2xl">{item.title}</Link>
                {item.venue ? <p className="text-sm text-muted">{item.venue.name}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}
