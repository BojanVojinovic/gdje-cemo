"use client";

import { ComboBox } from "@/components/combo-box";
import { InfoListSkeleton } from "@/components/skeletons";
import { Button, Field, useToast } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { seatsLabel, type FloorPlanPayload, type FloorTable } from "@/lib/hospitality";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function TablesPage() {
  const params = useParams<{ id: string }>();
  const { token } = useAuth();
  const toast = useToast();
  const [plan, setPlan] = useState<FloorPlanPayload | null>(null);

  async function load() {
    if (!token) return;
    const response = await api<FloorPlanPayload>(`/venues/${params.id}/floor-plan`, { token });
    setPlan(response.data);
  }

  useEffect(() => { void load().catch(() => undefined); }, [token, params.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save(table: FloorTable, patch: Record<string, unknown>) {
    if (!token) return;
    await api(`/business/tables/${table.id}`, { method: "PUT", token, body: patch });
    toast("Sto je sačuvan.");
    await load();
  }

  if (!plan) return <InfoListSkeleton />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-serif text-4xl">Stolovi</h1>
        <Link href={`/business/venues/${params.id}/floor-plan`} className="text-sm text-sea">Otvori tlocrt</Link>
      </div>
      <ul className="space-y-3">
        {plan.tables.map((table) => (
          <li key={table.id} className="grid gap-3 rounded-lg border border-line bg-paper p-4 md:grid-cols-[1fr_auto]">
            <div>
              <p className="font-medium">{table.name} · {seatsLabel(table.capacity_min, table.capacity_max)}</p>
              <p className="text-sm text-muted">{table.zone ?? "Bez zone"} · {table.shape} · {table.status} · {table.is_active ? "aktivan" : "isključen"}</p>
              {table.qr_token ? <Link href={`/table/${table.qr_token}`} className="text-sm text-sea">QR narudžbina</Link> : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => void save(table, { is_active: !table.is_active })}>{table.is_active ? "Isključi" : "Uključi"}</Button>
              <Button variant="secondary" onClick={async () => {
                const name = window.prompt("Novi naziv", table.name);
                if (name) await save(table, { name });
              }}>Preimenuj</Button>
              <Field label="Zona">
                <ComboBox value={table.zone_id ? String(table.zone_id) : ""} onChange={(value) => void save(table, { zone_id: value ? Number(value) : null })} options={[{ value: "", label: "Bez zone" }, ...plan.zones.map((zone) => ({ value: String(zone.id), label: zone.name }))]} />
              </Field>
              <Button variant="ghost" onClick={async () => { if (!token) return; await api(`/business/tables/${table.id}/qr`, { method: "POST", token }); toast("QR kod je osvježen."); await load(); }}>Novi QR</Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
