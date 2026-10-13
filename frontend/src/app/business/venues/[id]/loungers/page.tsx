"use client";

import { ComboBox } from "@/components/combo-box";
import { FloorCanvas } from "@/components/floor-canvas";
import { useI18n } from "@/components/i18n-provider";
import { FloorEditorSkeleton } from "@/components/skeletons";
import { Button, Field, inputClass, useToast } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatPrice } from "@/lib/format";
import type { FloorTable } from "@/lib/hospitality";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type Zone = { id: number; name: string; color: string; price: number; water_meters: number };
type Bed = {
  id: number;
  name: string;
  zone_id: number | null;
  zone: string | null;
  seats: number;
  price: number;
  own_price: number | null;
  water_meters: number | null;
  shape: string;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  rotation: number;
  status: string;
  is_orderable: boolean;
  is_active: boolean;
  qr_token?: string | null;
  free?: boolean;
};
type Rental = { id: number; lounger: string | null; guest_name: string; seats: number; price: number; status: string };
type Payload = { enabled: boolean; canvas_width: number; canvas_height: number; zones: Zone[]; loungers: Bed[]; rentals: Rental[] };

function asTable(bed: Bed): FloorTable {
  return {
    id: bed.id,
    name: bed.name,
    zone_id: bed.zone_id,
    zone: bed.zone,
    capacity_min: bed.seats,
    capacity_max: bed.seats,
    shape: bed.shape === "double" ? "rectangle" : "round",
    position_x: bed.position_x,
    position_y: bed.position_y,
    width: bed.width,
    height: bed.height,
    rotation: bed.rotation,
    public_state: bed.status === "blocked" ? "unavailable" : bed.status === "available" ? "available" : "occupied",
    status: bed.status,
    is_active: bed.is_active,
    is_orderable: bed.is_orderable,
  };
}

export default function LoungerEditorPage() {
  const params = useParams<{ id: string }>();
  const { token } = useAuth();
  const { t } = useI18n();
  const toast = useToast();
  const [payload, setPayload] = useState<Payload | null>(null);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [zone, setZone] = useState({ name: "", price: "15", water_meters: "8" });
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  async function load(day = date) {
    if (!token) return;
    const response = await api<Payload>(`/venues/${params.id}/loungers?date=${day}`, { token });
    setPayload(response.data);
    setBeds(response.data.loungers);
  }

  useEffect(() => { void load().catch(() => undefined); }, [token, params.id, date]); // eslint-disable-line react-hooks/exhaustive-deps

  const selected = beds.find((bed) => bed.id === selectedId) ?? null;

  function patch(next: Bed) {
    setBeds((current) => current.map((bed) => (bed.id === next.id ? next : bed)));
  }

  async function addZone(event: React.FormEvent) {
    event.preventDefault();
    if (!token) return;
    try {
      await api(`/business/venues/${params.id}/lounger-zones`, { method: "POST", token, body: { name: zone.name, price: Number(zone.price), water_meters: Number(zone.water_meters) } });
      setZone({ name: "", price: "15", water_meters: "8" });
      toast(t("lounger.zoneSaved"));
      await load();
    } catch (error) {
      toast(error instanceof ApiError ? error.message : t("api.failed"));
    }
  }

  async function addBed() {
    if (!token) return;
    const response = await api<Bed>(`/business/venues/${params.id}/loungers/items`, { method: "POST", token });
    setSelectedId(response.data.id);
    await load();
  }

  async function saveLayout() {
    if (!token) return;
    await api(`/business/venues/${params.id}/loungers/layout`, {
      method: "PUT",
      token,
      body: { loungers: beds.map((bed) => ({ id: bed.id, position_x: bed.position_x, position_y: bed.position_y, width: bed.width, height: bed.height, rotation: bed.rotation })) },
    });
    toast(t("lounger.layoutSaved"));
  }

  async function saveBed() {
    if (!token || !selected) return;
    try {
      await api(`/business/loungers/${selected.id}`, {
        method: "PUT",
        token,
        body: {
          name: selected.name,
          zone_id: selected.zone_id,
          seats: selected.seats,
          price: selected.own_price,
          shape: selected.shape,
          is_orderable: selected.is_orderable,
          is_active: selected.is_active,
          status: selected.status,
        },
      });
      toast(t("lounger.saved"));
      await load();
    } catch (error) {
      toast(error instanceof ApiError ? error.message : t("api.failed"));
    }
  }

  async function setRental(id: number, status: string) {
    if (!token) return;
    await api(`/business/lounger-rentals/${id}/status`, { method: "POST", token, body: { status } });
    await load();
  }

  if (!payload) return <FloorEditorSkeleton />;
  if (!payload.enabled) return <p className="text-sm text-muted">{t("lounger.off")}</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-serif text-4xl">{t("lounger.title")}</h1>
        <Field label={t("lounger.date")}>
          <input type="date" className={inputClass} value={date} onChange={(event) => setDate(event.target.value)} />
        </Field>
      </div>

      <form onSubmit={(event) => void addZone(event)} className="grid gap-3 rounded-lg border border-line bg-paper p-4 sm:grid-cols-4">
        <div data-setup="lounger-zone">
          <Field label={t("lounger.zoneName")}><input className={inputClass} value={zone.name} onChange={(event) => setZone({ ...zone, name: event.target.value })} required /></Field>
        </div>
        <div data-setup="lounger-price">
          <Field label={t("lounger.price")}><input className={inputClass} inputMode="decimal" value={zone.price} onChange={(event) => setZone({ ...zone, price: event.target.value })} required /></Field>
        </div>
        <div data-setup="lounger-water">
          <Field label={t("lounger.water")}><input className={inputClass} inputMode="numeric" value={zone.water_meters} onChange={(event) => setZone({ ...zone, water_meters: event.target.value })} required /></Field>
        </div>
        <div className="flex items-end"><Button type="submit">{t("lounger.addZone")}</Button></div>
      </form>

      <ul className="flex flex-wrap gap-2 text-sm">
        {payload.zones.map((item) => (
          <li key={item.id} className="rounded-full border border-line px-3 py-2">
            {item.name} · {formatPrice(item.price)} · {t("lounger.fromWater", { meters: item.water_meters })}
            <button type="button" className="ml-2 text-coral" onClick={async () => { if (!token) return; await api(`/business/lounger-zones/${item.id}`, { method: "DELETE", token }); await load(); }}>{t("action.delete")}</button>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-2">
        <span data-setup="lounger-add"><Button onClick={() => void addBed()}>{t("lounger.add")}</Button></span>
        <Button variant="secondary" onClick={() => void saveLayout()}>{t("lounger.saveLayout")}</Button>
      </div>

      <div data-setup="lounger-canvas">
        {beds.length === 0 ? <p className="text-sm text-muted">{t("lounger.none")}</p> : (
          <FloorCanvas
            tables={beds.map(asTable)}
            width={payload.canvas_width}
            height={payload.canvas_height}
            selectedId={selectedId}
            editable
            onSelect={setSelectedId}
            onChange={(table) => {
              const bed = beds.find((item) => item.id === table.id);
              if (bed) patch({ ...bed, position_x: table.position_x, position_y: table.position_y, width: table.width, height: table.height, rotation: table.rotation });
            }}
          />
        )}
      </div>

      {selected ? (
        <div className="grid gap-3 rounded-lg border border-line bg-paper p-4 sm:grid-cols-2">
          <Field label={t("admin.name")}><input className={inputClass} value={selected.name} onChange={(event) => patch({ ...selected, name: event.target.value })} /></Field>
          <Field label={t("lounger.seats")}><input type="number" min={1} max={8} className={inputClass} value={selected.seats} onChange={(event) => patch({ ...selected, seats: Number(event.target.value) })} /></Field>
          <Field label={t("lounger.zoneName")}>
            <ComboBox value={selected.zone_id ? String(selected.zone_id) : ""} onChange={(value) => patch({ ...selected, zone_id: value ? Number(value) : null })} options={[{ value: "", label: t("reserve.choose") }, ...payload.zones.map((item) => ({ value: String(item.id), label: item.name }))]} />
          </Field>
          <Field label={t("lounger.single")}>
            <ComboBox value={selected.shape} onChange={(value) => patch({ ...selected, shape: value })} options={[{ value: "single", label: t("lounger.single") }, { value: "double", label: t("lounger.double") }]} />
          </Field>
          <Field label={t("lounger.priceOverride")}>
            <input className={inputClass} inputMode="decimal" value={selected.own_price ?? ""} placeholder={String(selected.price)} onChange={(event) => patch({ ...selected, own_price: event.target.value === "" ? null : Number(event.target.value) })} />
          </Field>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" checked={selected.is_orderable} onChange={(event) => patch({ ...selected, is_orderable: event.target.checked })} />
            {t("lounger.qrOrder")}
          </label>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <Button onClick={() => void saveBed()}>{t("action.save")}</Button>
            <Button variant="danger" onClick={async () => { if (!token) return; await api(`/business/loungers/${selected.id}`, { method: "DELETE", token }); setSelectedId(null); await load(); }}>{t("action.delete")}</Button>
            {selected.qr_token ? <Link href={`/table/${selected.qr_token}`} className="inline-flex min-h-11 items-center text-sm text-sea">{t("lounger.openQr")}</Link> : null}
            <Button variant="ghost" onClick={async () => { if (!token) return; await api(`/business/loungers/${selected.id}/qr`, { method: "POST", token }); toast(t("lounger.qrRefreshed")); await load(); }}>{t("lounger.newQr")}</Button>
          </div>
        </div>
      ) : null}

      <section className="space-y-2">
        <h2 className="font-serif text-2xl">{t("lounger.rentals")}</h2>
        {payload.rentals.length === 0 ? <p className="text-sm text-muted">{t("lounger.free")}</p> : null}
        {payload.rentals.map((rental) => (
          <div key={rental.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line px-3 py-2 text-sm">
            <span>{rental.lounger} · {rental.guest_name} · {rental.seats} · {formatPrice(rental.price)} · {t(`lounger.${rental.status}`)}</span>
            <span className="flex gap-2">
              {rental.status === "pending" ? <Button onClick={() => void setRental(rental.id, "active")}>{t("lounger.confirm")}</Button> : null}
              {rental.status === "active" ? <Button variant="secondary" onClick={() => void setRental(rental.id, "ended")}>{t("lounger.end")}</Button> : null}
              {rental.status === "pending" || rental.status === "active" ? <Button variant="ghost" onClick={() => void setRental(rental.id, "cancelled")}>{t("action.cancel")}</Button> : null}
            </span>
          </div>
        ))}
      </section>
    </div>
  );
}
