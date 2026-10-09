"use client";

import { ComboBox } from "@/components/combo-box";
import { useI18n } from "@/components/i18n-provider";
import { FloorCanvas } from "@/components/floor-canvas";
import { InfoListSkeleton } from "@/components/skeletons";
import { Button, Field, inputClass, useToast } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { when, type FloorPlanPayload } from "@/lib/hospitality";
import type { Venue } from "@/types";
import { useEffect, useState } from "react";

type ReservationRow = {
  id: number;
  party_size: number;
  start_at: string;
  end_at: string;
  status: string;
  source: string;
  table_name: string;
  zone_name: string | null;
  guest_name: string | null;
  guest_phone: string | null;
  notes: string | null;
  venue?: { id: number; name: string; slug: string };
};

export default function ReservationsPage() {
  const { token } = useAuth();
  const { locale, t } = useI18n();
  const toast = useToast();
  const [rows, setRows] = useState<ReservationRow[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [view, setView] = useState<"list" | "day" | "floor">("list");
  const [venueId, setVenueId] = useState<number | null>(null);
  const [plan, setPlan] = useState<FloorPlanPayload | null>(null);
  const [walkIn, setWalkIn] = useState({ table_id: "", party_size: 2, guest_name: "" });
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!token) return;
    const query = new URLSearchParams();
    if (date && view !== "list") query.set("date", date);
    if (venueId) query.set("venue_id", String(venueId));
    setLoading(true);
    try {
      const response = await api<ReservationRow[]>(`/business/reservations?${query.toString()}`, { token });
      setRows(response.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token) return;
    api<Venue[]>("/business/venues", { token }).then((response) => {
      setVenues(response.data);
      setVenueId((current) => current ?? response.data[0]?.id ?? null);
    }).catch(() => undefined);
  }, [token]);

  useEffect(() => { void load().catch(() => undefined); }, [token, date, view, venueId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!token || !venueId) return;
    api<FloorPlanPayload>(`/venues/${venueId}/floor-plan`, { token }).then((response) => setPlan(response.data)).catch(() => undefined);
  }, [token, venueId, view]);

  async function setStatus(id: number, status: string) {
    if (!token) return;
    try {
      await api(`/business/reservations/${id}/status`, { method: "POST", token, body: { status } });
      toast(t("reserve.statusSaved"));
      await load();
    } catch (reason) {
      toast(reason instanceof ApiError ? reason.message : t("reserve.statusFailed"));
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="font-serif text-4xl">{t("business.reservations")}</h1>
      <div className="flex flex-wrap gap-2">
        {(["list", "day", "floor"] as const).map((item) => (
          <button key={item} type="button" onClick={() => setView(item)} className={`min-h-11 rounded-full px-4 text-sm ${view === item ? "bg-sea text-snow" : "bg-paper"}`}>
            {{ list: t("reserve.list"), day: t("reserve.day"), floor: t("venue.floor") }[item]}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("reserve.date")}><input type="date" className={inputClass} value={date} onChange={(event) => setDate(event.target.value)} /></Field>
        <Field label={t("reserve.place")}>
          <ComboBox value={venueId ? String(venueId) : ""} onChange={(value) => setVenueId(Number(value))} options={venues.map((venue) => ({ value: String(venue.id), label: venue.name }))} />
        </Field>
      </div>
      {view === "floor" && !plan ? <div className="aspect-[4/3] max-w-3xl animate-pulse border border-line bg-line" aria-busy="true" /> : null}
      {view === "floor" && plan ? <FloorCanvas tables={plan.tables} width={plan.floor_plan.canvas_width} height={plan.floor_plan.canvas_height} backgroundUrl={plan.floor_plan.background_url} /> : null}
      {loading ? <InfoListSkeleton /> : <ul className="space-y-3">
        {rows.map((row) => (
          <li key={row.id} className="rounded-lg border border-line bg-paper p-4">
            <p className="font-medium">{when(row.start_at, locale)} · {row.table_name} · {row.party_size} {t("reserve.guestsWord")}</p>
            <p className="text-sm text-muted">{row.venue?.name} · {t(`rsv.${row.status}`)} · {row.source === "walk_in" ? t("reserve.walkInLabel") : t("reserve.online")}{row.zone_name ? ` · ${row.zone_name}` : ""}</p>
            {row.guest_name ? <p className="text-sm">{row.guest_name}{row.guest_phone ? ` · ${row.guest_phone}` : ""}</p> : null}
            {row.notes ? <p className="text-sm text-muted">{row.notes}</p> : null}
            <div className="mt-3 flex flex-wrap gap-2">
              {row.status === "pending" ? <Button onClick={() => void setStatus(row.id, "confirmed")}>{t("reserve.confirm")}</Button> : null}
              {row.status === "pending" ? <Button variant="secondary" onClick={() => void setStatus(row.id, "rejected")}>{t("reserve.reject")}</Button> : null}
              {row.status === "confirmed" ? <Button onClick={() => void setStatus(row.id, "seated")}>{t("reserve.seat")}</Button> : null}
              {row.status === "confirmed" || row.status === "seated" ? <Button variant="secondary" onClick={() => void setStatus(row.id, "no_show")}>{t("reserve.noShow")}</Button> : null}
              {row.status === "seated" ? <Button variant="secondary" onClick={() => void setStatus(row.id, "completed")}>{t("reserve.close")}</Button> : null}
              {row.status === "pending" || row.status === "confirmed" ? <Button variant="ghost" onClick={() => void setStatus(row.id, "cancelled")}>{t("action.cancel")}</Button> : null}
            </div>
          </li>
        ))}
      </ul>}
      {!loading && view === "day" ? (
        <section className="space-y-2">
          <h2 className="font-serif text-2xl">{t("reserve.schedule")}</h2>
          {(plan?.tables ?? []).map((table) => {
            const hit = rows.find((row) => row.table_name === table.name && ["pending", "confirmed", "seated"].includes(row.status));
            return <p key={table.id} className="text-sm">{table.name} · {hit ? `${t(`rsv.${hit.status}`)} ${when(hit.start_at, locale)}` : t("reserve.free")}</p>;
          })}
        </section>
      ) : null}
      <form className="space-y-3 rounded-lg border border-line p-4" onSubmit={async (event) => {
        event.preventDefault();
        if (!token || !venueId) return;
        try {
          await api(`/business/venues/${venueId}/walk-ins`, { method: "POST", token, body: { ...walkIn, table_id: Number(walkIn.table_id), party_size: Number(walkIn.party_size) } });
          toast(t("reserve.seated"));
          await load();
        } catch (reason) {
          toast(reason instanceof ApiError ? (reason.errors?.table_id?.[0] || reason.message) : t("reserve.notSeated"));
        }
      }}>
        <h2 className="font-serif text-2xl">{t("reserve.walkIn")}</h2>
        <Field label={t("reserve.table")}>
          <ComboBox value={walkIn.table_id} onChange={(value) => setWalkIn({ ...walkIn, table_id: value })} options={[{ value: "", label: t("reserve.choose") }, ...(plan?.tables.map((table) => ({ value: String(table.id), label: table.name })) ?? [])]} />
        </Field>
        <Field label={t("reserve.party")}><input type="number" min={1} className={inputClass} value={walkIn.party_size} onChange={(event) => setWalkIn({ ...walkIn, party_size: Number(event.target.value) })} /></Field>
        <Field label={t("admin.name")}><input className={inputClass} value={walkIn.guest_name} onChange={(event) => setWalkIn({ ...walkIn, guest_name: event.target.value })} /></Field>
        <Button type="submit">{t("reserve.seatGuest")}</Button>
      </form>
    </div>
  );
}
