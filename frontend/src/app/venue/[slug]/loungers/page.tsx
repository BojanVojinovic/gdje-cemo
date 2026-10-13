"use client";

import { FloorCanvas } from "@/components/floor-canvas";
import { useI18n } from "@/components/i18n-provider";
import { FloorEditorSkeleton } from "@/components/skeletons";
import { Button, Field, inputClass, useToast } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatPrice } from "@/lib/format";
import type { FloorTable } from "@/lib/hospitality";
import type { Venue as VenueRow } from "@/types";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type Zone = { id: number; name: string; price: number; water_meters: number };
type Bed = {
  id: number;
  name: string;
  zone: string | null;
  seats: number;
  price: number;
  water_meters: number | null;
  shape: string;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  rotation: number;
  free?: boolean;
  is_active: boolean;
};
type Payload = { enabled: boolean; canvas_width: number; canvas_height: number; zones: Zone[]; loungers: Bed[] };

export default function PublicLoungersPage() {
  const params = useParams<{ slug: string }>();
  const { token } = useAuth();
  const { t } = useI18n();
  const toast = useToast();
  const [venue, setVenue] = useState<VenueRow | null>(null);
  const [payload, setPayload] = useState<Payload | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [seats, setSeats] = useState(1);
  const [guestName, setGuestName] = useState("");
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    api<{ venue: VenueRow }>(`/venues/${params.slug}`)
      .then(async (response) => {
        setVenue(response.data.venue);
        if (!response.data.venue.offers_loungers) {
          setMissing(true);
          return;
        }
        const beach = await api<Payload>(`/venues/${response.data.venue.id}/loungers?date=${date}`, { token: token ?? undefined });
        setPayload(beach.data);
      })
      .catch(() => setMissing(true));
  }, [params.slug, date, token]);

  const selected = payload?.loungers.find((bed) => bed.id === selectedId) ?? null;

  async function requestRental() {
    if (!venue || !selected) {
      toast(t("lounger.pick"));
      return;
    }
    if (!token && guestName.trim() === "") {
      toast(t("lounger.needName"));
      return;
    }
    try {
      await api(`/venues/${venue.id}/lounger-rentals`, {
        method: "POST",
        token,
        body: { lounger_id: selected.id, rental_date: date, seats, guest_name: token ? undefined : guestName.trim() },
      });
      toast(t("lounger.requested"));
      const beach = await api<Payload>(`/venues/${venue.id}/loungers?date=${date}`, { token });
      setPayload(beach.data);
    } catch (error) {
      const detail = error instanceof ApiError ? (error.errors ? Object.values(error.errors).flat()[0] : error.message) : t("api.failed");
      toast(detail);
    }
  }

  if (missing) return <p className="mx-auto max-w-3xl px-4 py-10 text-sm text-muted">{t("lounger.off")}</p>;
  if (!venue || !payload) return <div className="mx-auto max-w-3xl px-4 py-10"><FloorEditorSkeleton /></div>;

  const tables: FloorTable[] = payload.loungers.filter((bed) => bed.is_active).map((bed) => ({
    id: bed.id,
    name: bed.name,
    capacity_min: bed.seats,
    capacity_max: bed.seats,
    shape: bed.shape === "double" ? "rectangle" : "round",
    position_x: bed.position_x,
    position_y: bed.position_y,
    width: bed.width,
    height: bed.height,
    rotation: bed.rotation,
    public_state: bed.free ? "available" : "occupied",
    zone: bed.zone,
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div>
        <Link href={`/venue/${venue.slug}`} className="text-sm text-sea">{venue.name}</Link>
        <h1 className="mt-2 font-serif text-4xl">{t("lounger.title")}</h1>
      </div>
      <ul className="space-y-2 text-sm">
        {payload.zones.map((zone) => (
          <li key={zone.id} className="rounded-lg border border-line px-3 py-2">
            {zone.name} · {formatPrice(zone.price)} {t("lounger.perDay")} · {t("lounger.fromWater", { meters: zone.water_meters })}
          </li>
        ))}
      </ul>
      <FloorCanvas tables={tables} width={payload.canvas_width} height={payload.canvas_height} selectedId={selectedId} onSelect={setSelectedId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("lounger.date")}><input type="date" className={inputClass} value={date} onChange={(event) => setDate(event.target.value)} /></Field>
        <Field label={t("lounger.seats")}><input type="number" min={1} max={selected?.seats ?? 8} className={inputClass} value={seats} onChange={(event) => setSeats(Number(event.target.value))} /></Field>
        {!token ? <Field label={t("lounger.yourName")}><input className={inputClass} value={guestName} onChange={(event) => setGuestName(event.target.value)} required /></Field> : null}
      </div>
      <p className="text-sm text-muted">{selected ? `${selected.name} · ${selected.seats} · ${formatPrice(selected.price)} · ${selected.free ? t("lounger.free") : t("lounger.taken")}` : t("lounger.pick")}</p>
      <Button disabled={!selected?.free} onClick={() => void requestRental()}>{t("lounger.request")}</Button>
    </div>
  );
}
