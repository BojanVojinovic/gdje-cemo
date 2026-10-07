"use client";

import { ComboBox } from "@/components/combo-box";
import { FloorCanvas, TableLegend } from "@/components/floor-canvas";
import { ReservePageSkeleton } from "@/components/skeletons";
import { Button, Field, inputClass, useToast } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { brandButtonStyle } from "@/lib/brand";
import { useAuth } from "@/lib/auth";
import { seatsLabel, type FloorPlanPayload, type FloorTable } from "@/lib/hospitality";
import type { VenueDetail } from "@/types";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Availability = {
  start_at: string;
  end_at: string;
  allow_table_selection: boolean;
  tables: FloorTable[];
  combinations: { id: number; name: string; capacity_min: number; capacity_max: number; table_ids: number[] }[];
};

export default function ReservePage() {
  const params = useParams<{ slug: string }>();
  const { token, user, ready } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [venueId, setVenueId] = useState<number | null>(null);
  const [brand, setBrand] = useState<{ color?: string | null; ink?: string | null }>({});
  const [name, setName] = useState("");
  const [plan, setPlan] = useState<FloorPlanPayload | null>(null);
  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  const [date, setDate] = useState("");
  const [time, setTime] = useState("19:00");
  const [party, setParty] = useState(2);
  const [zoneId, setZoneId] = useState("");
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [combination, setCombination] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api<VenueDetail>(`/venues/${params.slug}`)
      .then(async (response) => {
        setVenueId(response.data.venue.id);
        setName(response.data.venue.name);
        setBrand({ color: response.data.venue.brand_color, ink: response.data.venue.brand_ink });
        const floor = await api<FloorPlanPayload>(`/venues/${response.data.venue.id}/floor-plan`);
        setPlan(floor.data);
      })
      .catch(() => setError("Mjesto nije pronađeno."));
  }, [params.slug]);

  async function search(event: React.FormEvent) {
    event.preventDefault();
    if (!venueId || !date) return;
    setError("");
    setSelected(null);
    setCombination(null);
    try {
      const query = new URLSearchParams({ start_at: `${date}T${time}:00`, party_size: String(party) });
      if (zoneId) query.set("zone_id", zoneId);
      const response = await api<Availability>(`/venues/${venueId}/availability?${query.toString()}`);
      setAvailability(response.data);
    } catch (reason) {
      setAvailability(null);
      setError(reason instanceof ApiError ? (reason.errors?.start_at?.[0] || reason.errors?.party_size?.[0] || reason.errors?.date?.[0] || reason.message) : "Termin nije provjeren.");
    }
  }

  async function confirm() {
    if (!ready) return;
    if (!user || !token || !venueId || !date) {
      router.push("/login");
      return;
    }
    try {
      await api(`/venues/${venueId}/reservations`, {
        method: "POST",
        token,
        body: {
          start_at: `${date}T${time}:00`,
          party_size: party,
          table_id: availability?.allow_table_selection ? selected : null,
          combination_id: availability?.allow_table_selection ? combination : null,
          notes,
        },
      });
      toast("Rezervacija je sačuvana.");
      router.push("/profile/reservations");
    } catch (reason) {
      setError(reason instanceof ApiError ? (reason.errors?.table_id?.[0] || reason.errors?.party_size?.[0] || reason.message) : "Rezervacija nije sačuvana.");
    }
  }

  async function waitlist() {
    if (!user || !token || !venueId) {
      router.push("/login");
      return;
    }
    try {
      await api(`/venues/${venueId}/waitlist`, {
        method: "POST",
        token,
        body: { start_at: `${date}T${time}:00`, party_size: party, flexibility_minutes: 60 },
      });
      toast("Na listi ste čekanja.");
    } catch (reason) {
      toast(reason instanceof ApiError ? reason.message : "Lista čekanja nije sačuvana.");
    }
  }

  const visible = plan ? plan.tables.map((table) => ({
    ...table,
    public_state: availability?.tables.some((row) => row.id === table.id) ? (selected === table.id ? "selected" : "available") : (availability ? "unavailable" : table.public_state),
  })) : [];

  const chosenTable = availability?.tables.find((table) => table.id === selected);
  const chosenCombo = availability?.combinations.find((row) => row.id === combination);

  if (!ready || (!user ? false : !venueId && !error)) return <ReservePageSkeleton />;
  if (!user) return <p className="mx-auto max-w-5xl px-4 py-8 text-sm text-muted">Prijava je potrebna.</p>;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 pb-28">
      <Link href={`/venue/${params.slug}`} className="text-sm text-sea">{name || "Mjesto"}</Link>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Rezervacija</p>
        <h1 className="font-serif text-4xl sm:text-5xl">Izaberite termin i sto</h1>
      </div>
      <form onSubmit={search} className="grid gap-3 border border-line bg-paper p-4 sm:grid-cols-4">
        <Field label="Datum"><input required type="date" className={inputClass} value={date} onChange={(event) => setDate(event.target.value)} /></Field>
        <Field label="Vrijeme"><input required type="time" className={inputClass} value={time} onChange={(event) => setTime(event.target.value)} /></Field>
        <Field label="Broj gostiju"><input required type="number" min={1} max={40} className={inputClass} value={party} onChange={(event) => setParty(Number(event.target.value))} /></Field>
        <Field label="Zona">
          <ComboBox value={zoneId} onChange={setZoneId} options={[{ value: "", label: "Sve zone" }, ...(plan?.zones.map((zone) => ({ value: String(zone.id), label: zone.name })) ?? [])]} />
        </Field>
        <Button type="submit" className="sm:col-span-4 sm:w-fit" style={brandButtonStyle(brand.color, brand.ink)}>Prikaži slobodne stolove</Button>
      </form>
      {error ? <p className="text-sm text-coral">{error}</p> : null}
      {availability ? (
        <section className="space-y-4">
          <TableLegend />
          {plan ? (
            <FloorCanvas
              tables={visible}
              width={plan.floor_plan.canvas_width}
              height={plan.floor_plan.canvas_height}
              backgroundUrl={plan.floor_plan.background_url}
              selectedId={selected}
              onSelect={(id) => {
                if (!availability.allow_table_selection) return;
                if (!availability.tables.some((table) => table.id === id)) return;
                setSelected(id);
                setCombination(null);
              }}
            />
          ) : null}
          {availability.tables.length === 0 && availability.combinations.length === 0 ? (
            <div className="border border-line bg-paper p-5">
              <p>Nema slobodnog stola za ovaj termin.</p>
              {plan?.settings.waitlist_enabled ? <Button className="mt-3" onClick={() => void waitlist()}>Lista čekanja</Button> : null}
            </div>
          ) : (
            <>
              <ul className="grid gap-2 sm:grid-cols-2">
                {availability.tables.map((table) => (
                  <li key={table.id}>
                    <button type="button" disabled={!availability.allow_table_selection} onClick={() => { setSelected(table.id); setCombination(null); }} className={`w-full border px-4 py-3 text-left text-sm ${selected === table.id ? "border-sea bg-sea/20" : "border-line bg-paper"}`}>
                      <span className="block font-semibold">Sto {table.name}</span>
                      <span className="text-muted">{seatsLabel(table.capacity_min, table.capacity_max)}{table.zone ? ` · ${table.zone}` : ""} · Slobodan</span>
                    </button>
                  </li>
                ))}
                {availability.combinations.map((row) => (
                  <li key={row.id}>
                    <button type="button" disabled={!availability.allow_table_selection} onClick={() => { setCombination(row.id); setSelected(null); }} className={`w-full border px-4 py-3 text-left text-sm ${combination === row.id ? "border-sea bg-sea/20" : "border-line bg-paper"}`}>
                      <span className="block font-semibold">{row.name}</span>
                      <span className="text-muted">{seatsLabel(row.capacity_min, row.capacity_max)} · Spojeni stolovi</span>
                    </button>
                  </li>
                ))}
              </ul>
              {!availability.allow_table_selection ? <p className="text-sm text-muted">Mjesto dodjeljuje sto. Vi birate samo termin i broj gostiju.</p> : null}
              {(chosenTable || chosenCombo) ? (
                <div className="border border-sea bg-paper p-4 text-sm">
                  <p className="font-semibold">{chosenTable ? `Sto ${chosenTable.name}` : chosenCombo?.name}</p>
                  <p className="text-muted">{chosenTable ? seatsLabel(chosenTable.capacity_min, chosenTable.capacity_max) : chosenCombo ? seatsLabel(chosenCombo.capacity_min, chosenCombo.capacity_max) : ""} · {date} u {time}</p>
                </div>
              ) : null}
              <Field label="Napomena"><textarea className={inputClass + " min-h-20 py-2"} value={notes} onChange={(event) => setNotes(event.target.value)} /></Field>
              <Button onClick={() => void confirm()} disabled={availability.allow_table_selection && !selected && !combination} style={brandButtonStyle(brand.color, brand.ink)}>Potvrdi rezervaciju</Button>
            </>
          )}
        </section>
      ) : null}
    </div>
  );
}
