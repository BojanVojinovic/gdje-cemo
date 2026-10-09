"use client";

import { ComboBox } from "@/components/combo-box";
import { useI18n } from "@/components/i18n-provider";
import { FloorCanvas, TableLegend } from "@/components/floor-canvas";
import { FloorEditorSkeleton } from "@/components/skeletons";
import { Button, Field, inputClass, useToast } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { seatsLabel, type FloorPlanPayload, type FloorTable } from "@/lib/hospitality";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

const shapes = ["round", "square", "rectangle", "oval", "custom"] as const;
const statuses = ["available", "reserved", "occupied", "ordering", "unavailable", "maintenance", "closed"] as const;

export default function FloorPlanEditorPage() {
  const params = useParams<{ id: string }>();
  const { token } = useAuth();
  const { t } = useI18n();
  const toast = useToast();
  const [plan, setPlan] = useState<FloorPlanPayload | null>(null);
  const [tables, setTables] = useState<FloorTable[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [zoneName, setZoneName] = useState("");
  const [closure, setClosure] = useState({ starts_at: "", ends_at: "", reason: "" });

  async function load() {
    if (!token) return;
    const response = await api<FloorPlanPayload>(`/venues/${params.id}/floor-plan`, { token });
    setPlan(response.data);
    setTables(response.data.tables);
  }

  useEffect(() => { void load().catch(() => undefined); }, [token, params.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const selected = tables.find((table) => table.id === selectedId) ?? null;

  function patchLocal(next: FloorTable) {
    setTables((current) => current.map((table) => (table.id === next.id ? next : table)));
  }

  async function saveLayout() {
    if (!token) return;
    await api(`/business/venues/${params.id}/tables/layout`, {
      method: "PUT",
      token,
      body: { tables: tables.map((table) => ({ id: table.id, position_x: table.position_x, position_y: table.position_y, width: table.width, height: table.height, rotation: table.rotation })) },
    });
    toast(t("floor.layoutSaved"));
  }

  async function saveTable() {
    if (!token || !selected) return;
    await api(`/business/tables/${selected.id}`, {
      method: "PUT",
      token,
      body: {
        name: selected.name,
        zone_id: selected.zone_id,
        capacity_min: selected.capacity_min,
        capacity_max: selected.capacity_max,
        shape: selected.shape,
        rotation: selected.rotation,
        status: selected.status,
        is_reservable: selected.is_reservable,
        is_orderable: selected.is_orderable,
        is_active: selected.is_active,
        feature_ids: selected.features?.map((feature) => feature.id) ?? [],
      },
    });
    toast(t("floor.tableSaved"));
    await load();
  }

  async function addTable(shape = "square") {
    if (!token) return;
    const response = await api<FloorTable>(`/business/venues/${params.id}/tables`, {
      method: "POST",
      token,
      body: { name: `T${tables.length + 1}`, capacity_min: 2, capacity_max: 4, shape, position_x: 40 + tables.length * 12, position_y: 40 },
    });
    setSelectedId(response.data.id);
    await load();
  }

  async function addZone(event: React.FormEvent) {
    event.preventDefault();
    if (!token || !zoneName.trim()) return;
    await api(`/business/venues/${params.id}/zones`, { method: "POST", token, body: { name: zoneName } });
    setZoneName("");
    await load();
  }

  async function uploadBackground(file: File) {
    if (!token) return;
    const data = new FormData();
    data.append("background", file);
    await api(`/business/venues/${params.id}/floor-plan`, { method: "POST", token, formData: data });
    toast(t("floor.backgroundSaved"));
    await load();
  }

  async function saveSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !plan) return;
    const form = new FormData(event.currentTarget);
    const body: Record<string, string | boolean | number> = {};
    form.forEach((value, key) => {
      if (value === "on") body[key] = true;
      else if (value === "true" || value === "false") body[key] = value === "true";
      else if (value !== "") body[key] = Number.isNaN(Number(value)) ? String(value) : Number(value);
    });
    ["enabled", "auto_confirm", "allow_table_selection", "auto_assign", "allow_larger_tables", "waitlist_enabled"].forEach((key) => {
      body[key] = form.get(key) === "on";
    });
    try {
      await api(`/business/venues/${params.id}/reservation-settings`, { method: "PUT", token, body });
      toast(t("floor.settingsSaved"));
    } catch (reason) {
      toast(reason instanceof ApiError ? reason.message : t("floor.settingsFailed"));
    }
  }

  if (!plan) return <FloorEditorSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-4xl">{t("venue.floor")}</h1>
          <p className="text-sm text-muted">{t("floor.hint")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/business/venues/${params.id}/tables`} className="text-sm text-sea">{t("floor.list")}</Link>
          <Button onClick={() => void addTable("square")}>{t("floor.newTable")}</Button>
          <Button variant="secondary" onClick={() => void saveLayout()} disabled={!tables.length}>{t("action.save")}</Button>
        </div>
      </div>
      <TableLegend />
      <div className="grid gap-4 xl:grid-cols-[180px_minmax(0,1fr)_300px]">
        <aside className="space-y-2 border border-line bg-paper p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{t("floor.tools")}</p>
          {(["square", "round", "rectangle", "oval"] as const).map((shape) => (
            <Button key={shape} variant="secondary" className="w-full" onClick={() => void addTable(shape)}>{t(`shape.${shape}`)}</Button>
          ))}
        </aside>
        <FloorCanvas
          tables={tables}
          width={plan.floor_plan.canvas_width}
          height={plan.floor_plan.canvas_height}
          backgroundUrl={plan.floor_plan.background_url}
          selectedId={selectedId}
          editable
          onSelect={setSelectedId}
          onChange={patchLocal}
        />
        <aside className="space-y-4 border border-line bg-paper p-4">
          {selected ? (
            <div className="space-y-3">
              <h2 className="font-serif text-2xl">{selected.name}</h2>
              <Field label={t("field.name")}><input className={inputClass} value={selected.name} onChange={(event) => patchLocal({ ...selected, name: event.target.value })} /></Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label={t("floor.min")}><input type="number" min={1} className={inputClass} value={selected.capacity_min} onChange={(event) => patchLocal({ ...selected, capacity_min: Number(event.target.value) })} /></Field>
                <Field label={t("floor.max")}><input type="number" min={1} className={inputClass} value={selected.capacity_max} onChange={(event) => patchLocal({ ...selected, capacity_max: Number(event.target.value) })} /></Field>
              </div>
              <p className="text-xs text-muted">{seatsLabel(selected.capacity_min, selected.capacity_max, t)}</p>
              <Field label={t("floor.shape")}>
                <ComboBox value={selected.shape} onChange={(value) => patchLocal({ ...selected, shape: value })} options={shapes.map((shape) => ({ value: shape, label: t(`shape.${shape}`) }))} />
              </Field>
              <Field label={t("floor.zone")}>
                <ComboBox value={selected.zone_id ? String(selected.zone_id) : ""} onChange={(value) => patchLocal({ ...selected, zone_id: value ? Number(value) : null })} options={[{ value: "", label: t("venue.noZone") }, ...plan.zones.map((zone) => ({ value: String(zone.id), label: zone.name }))]} />
              </Field>
              <Field label={t("admin.status")}>
                <ComboBox value={selected.status ?? "available"} onChange={(value) => patchLocal({ ...selected, status: value })} options={statuses.map((status) => ({ value: status, label: status }))} />
              </Field>
              <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={selected.is_active !== false} onChange={(event) => patchLocal({ ...selected, is_active: event.target.checked })} /> {t("floor.active")}</label>
              <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={selected.is_reservable !== false} onChange={(event) => patchLocal({ ...selected, is_reservable: event.target.checked })} /> {t("floor.reservable")}</label>
              <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={selected.is_orderable !== false} onChange={(event) => patchLocal({ ...selected, is_orderable: event.target.checked })} /> {t("floor.qrOrder")}</label>
              <fieldset className="space-y-1">
                <legend className="text-sm font-medium">{t("floor.features")}</legend>
                {plan.features.map((feature) => {
                  const checked = selected.features?.some((row) => row.id === feature.id) ?? false;
                  return (
                    <label key={feature.id} className="flex min-h-9 items-center gap-2 text-sm">
                      <input type="checkbox" checked={checked} onChange={(event) => {
                        const next = event.target.checked
                          ? [...(selected.features ?? []), feature]
                          : (selected.features ?? []).filter((row) => row.id !== feature.id);
                        patchLocal({ ...selected, features: next });
                      }} />
                      {feature.name}
                    </label>
                  );
                })}
              </fieldset>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => void saveTable()}>{t("action.save")}</Button>
                <Button variant="secondary" onClick={() => patchLocal({ ...selected, rotation: (selected.rotation + 15) % 360 })}>{t("floor.rotate")}</Button>
                <Button variant="secondary" onClick={async () => { if (!token) return; await api(`/business/tables/${selected.id}/duplicate`, { method: "POST", token }); await load(); }}>{t("action.duplicate")}</Button>
                <Button variant="danger" onClick={async () => { if (!token) return; await api(`/business/tables/${selected.id}`, { method: "DELETE", token }); setSelectedId(null); await load(); }}>{t("action.delete")}</Button>
              </div>
              {selected.qr_token ? <Link href={`/table/${selected.qr_token}`} className="block text-sm text-sea">{t("floor.openQr")}</Link> : null}
              <Button variant="ghost" onClick={async () => { if (!token) return; await api(`/business/tables/${selected.id}/qr`, { method: "POST", token }); toast(t("floor.qrRefreshed")); await load(); }}>{t("floor.newQr")}</Button>
            </div>
          ) : <p className="text-sm text-muted">{t("floor.pickTable")}</p>}
        </aside>
      </div>

      <section className="grid gap-4 lg:grid-cols-2">
        <form onSubmit={addZone} className="space-y-3 rounded-lg border border-line p-4">
          <h2 className="font-serif text-2xl">{t("floor.zones")}</h2>
          <ul className="space-y-2 text-sm">
            {plan.zones.map((zone) => (
              <li key={zone.id} className="flex items-center justify-between gap-2">
                <span>{zone.name}</span>
                <button type="button" className="text-coral" onClick={async () => { if (!token) return; await api(`/business/zones/${zone.id}`, { method: "DELETE", token }); await load(); }}>{t("action.delete")}</button>
              </li>
            ))}
          </ul>
          <Field label={t("floor.newZone")}><input className={inputClass} value={zoneName} onChange={(event) => setZoneName(event.target.value)} /></Field>
          <Button type="submit">{t("action.add")}</Button>
        </form>
        <form onSubmit={saveSettings} className="space-y-3 rounded-lg border border-line p-4">
          <h2 className="font-serif text-2xl">{t("business.reservations")}</h2>
          <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" name="enabled" defaultChecked={plan.settings.enabled} /> {t("floor.reservationsOn")}</label>
          <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" name="auto_confirm" defaultChecked={plan.settings.auto_confirm} /> {t("floor.autoConfirm")}</label>
          <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" name="allow_table_selection" defaultChecked={plan.settings.allow_table_selection} /> {t("floor.guestPicks")}</label>
          <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" name="auto_assign" defaultChecked={plan.settings.auto_assign} /> {t("floor.autoAssign")}</label>
          <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" name="allow_larger_tables" defaultChecked={plan.settings.allow_larger_tables} /> {t("floor.larger")}</label>
          <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" name="waitlist_enabled" defaultChecked={plan.settings.waitlist_enabled} /> {t("floor.waitlist")}</label>
          <div className="grid grid-cols-2 gap-2">
            <Field label={t("floor.minAdvance")}><input name="min_advance_minutes" type="number" className={inputClass} defaultValue={plan.settings.min_advance_minutes} /></Field>
            <Field label={t("floor.maxAdvance")}><input name="max_advance_days" type="number" className={inputClass} defaultValue={plan.settings.max_advance_days} /></Field>
            <Field label={t("floor.duration")}><input name="duration_minutes" type="number" className={inputClass} defaultValue={plan.settings.duration_minutes} /></Field>
            <Field label={t("floor.buffer")}><input name="buffer_minutes" type="number" className={inputClass} defaultValue={plan.settings.buffer_minutes} /></Field>
            <Field label={t("floor.minParty")}><input name="min_party_size" type="number" className={inputClass} defaultValue={plan.settings.min_party_size} /></Field>
            <Field label={t("floor.maxParty")}><input name="max_party_size" type="number" className={inputClass} defaultValue={plan.settings.max_party_size} /></Field>
            <Field label={t("floor.cancelBy")}><input name="cancellation_deadline_minutes" type="number" className={inputClass} defaultValue={plan.settings.cancellation_deadline_minutes} /></Field>
          </div>
          <Button type="submit">{t("action.save")}</Button>
        </form>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <form className="space-y-3 rounded-lg border border-line p-4" onSubmit={async (event) => {
          event.preventDefault();
          if (!token) return;
          await api(`/business/venues/${params.id}/closures`, { method: "POST", token, body: closure });
          setClosure({ starts_at: "", ends_at: "", reason: "" });
          toast(t("floor.closureSaved"));
          await load();
        }}>
          <h2 className="font-serif text-2xl">{t("floor.closures")}</h2>
          <ul className="space-y-2 text-sm">
            {plan.closures.map((row) => (
              <li key={row.id} className="flex justify-between gap-2">
                <span>{row.reason}</span>
                <button type="button" className="text-coral" onClick={async () => { if (!token) return; await api(`/business/closures/${row.id}`, { method: "DELETE", token }); await load(); }}>{t("action.delete")}</button>
              </li>
            ))}
          </ul>
          <Field label={t("floor.from")}><input required type="datetime-local" className={inputClass} value={closure.starts_at} onChange={(event) => setClosure({ ...closure, starts_at: event.target.value })} /></Field>
          <Field label={t("floor.to")}><input required type="datetime-local" className={inputClass} value={closure.ends_at} onChange={(event) => setClosure({ ...closure, ends_at: event.target.value })} /></Field>
          <Field label={t("floor.reason")}><input required className={inputClass} value={closure.reason} onChange={(event) => setClosure({ ...closure, reason: event.target.value })} /></Field>
          <Button type="submit">{t("action.add")}</Button>
        </form>
        <div className="space-y-3 rounded-lg border border-line p-4">
          <h2 className="font-serif text-2xl">{t("floor.background")}</h2>
          <p className="text-sm text-muted">{t("floor.backgroundHint")}</p>
          <label className="inline-flex min-h-11 cursor-pointer items-center text-sm text-sea">
            {t("floor.upload")}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadBackground(file); }} />
          </label>
          <CombinationForm venueId={params.id} tables={tables} onSaved={load} />
        </div>
      </section>
    </div>
  );
}

function CombinationForm({ venueId, tables, onSaved }: { venueId: string; tables: FloorTable[]; onSaved: () => Promise<void> }) {
  const { token } = useAuth();
  const { t } = useI18n();
  const toast = useToast();
  const [name, setName] = useState("");
  const [ids, setIds] = useState<number[]>([]);

  return (
    <form className="space-y-2" onSubmit={async (event) => {
      event.preventDefault();
      if (!token || ids.length < 2) return;
      const chosen = tables.filter((table) => ids.includes(table.id));
      await api(`/business/venues/${venueId}/table-combinations`, {
        method: "POST",
        token,
        body: {
          name,
          capacity_min: chosen.reduce((sum, table) => sum + table.capacity_min, 0),
          capacity_max: chosen.reduce((sum, table) => sum + table.capacity_max, 0),
          table_ids: ids,
        },
      });
      toast(t("floor.combinedSaved"));
      setName("");
      setIds([]);
      await onSaved();
    }}>
      <h3 className="font-medium">{t("floor.combined")}</h3>
      <input aria-label={t("field.name")} className={inputClass} placeholder="T4 + T5" value={name} onChange={(event) => setName(event.target.value)} />
      <div className="flex flex-wrap gap-2">
        {tables.map((table) => (
          <label key={table.id} className="text-sm"><input type="checkbox" checked={ids.includes(table.id)} onChange={(event) => setIds(event.target.checked ? [...ids, table.id] : ids.filter((id) => id !== table.id))} /> {table.name}</label>
        ))}
      </div>
      <Button type="submit" variant="secondary">{t("action.save")}</Button>
    </form>
  );
}
