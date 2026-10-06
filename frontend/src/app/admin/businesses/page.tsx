"use client";

import { ComboBox } from "@/components/combo-box";
import { InfoListSkeleton } from "@/components/skeletons";
import { Button, EmptyState, Field, inputClass, useToast } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";

type BusinessRow = {
  id: number;
  name: string;
  status: string;
  phone: string | null;
  description: string | null;
  rejection_reason: string | null;
  venues_count: number;
  owner: { name: string; email: string } | null;
};

export default function AdminBusinessesPage() {
  const { token } = useAuth();
  const toast = useToast();
  const [rows, setRows] = useState<BusinessRow[]>([]);
  const [status, setStatus] = useState("");
  const [reason, setReason] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);

  async function load(next = status) {
    if (!token) return;
    setLoading(true);
    try {
      const response = await api<BusinessRow[]>(`/admin/businesses?status=${next}`, { token });
      setRows(response.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load("").catch(() => undefined); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  async function approve(id: number) {
    if (!token || !window.confirm("Odobriti biznis?")) return;
    await api(`/admin/businesses/${id}/approve`, { method: "POST", token });
    toast("Biznis je odobren.");
    await load();
  }

  async function reject(id: number) {
    if (!token) return;
    try {
      await api(`/admin/businesses/${id}/reject`, { method: "POST", token, body: { reason: reason[id] || "Zahtjev nije kompletan." } });
      toast("Zahtjev je odbijen.");
      await load();
    } catch (error) {
      toast(error instanceof ApiError ? error.message : "Odbijanje nije uspjelo.");
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="font-serif text-4xl">Biznisi</h1>
      <div className="max-w-xs">
        <ComboBox ariaLabel="Status biznisa" value={status} onChange={(value) => { setStatus(value); void load(value); }} options={[
          { value: "", label: "Svi statusi" },
          { value: "pending", label: "Na čekanju" },
          { value: "approved", label: "Odobreni" },
          { value: "rejected", label: "Odbijeni" },
        ]} />
      </div>
      {loading ? <InfoListSkeleton /> : null}
      {!loading && rows.length === 0 ? <EmptyState title="Nema biznisa." body="Novi zahtjevi će se pojaviti ovdje." /> : null}
      {!loading ? <ul className="space-y-3">
        {rows.map((row) => (
          <li key={row.id} className="rounded-lg border border-line bg-paper p-4">
            <p className="font-medium">{row.name} · {row.status}</p>
            <p className="text-sm text-muted">{row.owner?.name} · {row.owner?.email} · {row.venues_count} mjesta</p>
            <p className="mt-2 text-sm">{row.description}</p>
            {row.status === "pending" ? (
              <div className="mt-3 space-y-2">
                <Field label="Razlog odbijanja"><input className={inputClass} value={reason[row.id] ?? ""} onChange={(event) => setReason({ ...reason, [row.id]: event.target.value })} /></Field>
                <div className="flex gap-2">
                  <Button onClick={() => approve(row.id)}>Odobri</Button>
                  <Button variant="danger" onClick={() => reject(row.id)}>Odbij</Button>
                </div>
              </div>
            ) : null}
          </li>
        ))}
      </ul> : null}
    </div>
  );
}
