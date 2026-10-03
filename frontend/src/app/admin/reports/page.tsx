"use client";

import { EmptyState, inputClass, useToast } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import type { Report } from "@/types";
import { useEffect, useState } from "react";

export default function AdminReportsPage() {
  const { token } = useAuth();
  const toast = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [status, setStatus] = useState("pending");

  async function load(next = status) {
    if (!token) return;
    const response = await api<Report[]>(`/admin/reports?status=${next}`, { token });
    setReports(response.data);
  }

  useEffect(() => { void load("pending").catch(() => undefined); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  async function update(report: Report, next: string) {
    if (!token) return;
    await api(`/admin/reports/${report.id}`, { method: "PUT", token, body: { status: next } });
    toast("Prijava je ažurirana.");
    await load();
  }

  return (
    <div className="space-y-4">
      <h1 className="font-serif text-4xl">Prijave</h1>
      <select className={inputClass + " max-w-xs"} value={status} onChange={(event) => { setStatus(event.target.value); void load(event.target.value); }}>
        <option value="">Sve</option>
        <option value="pending">Na čekanju</option>
        <option value="reviewed">Pregledano</option>
        <option value="resolved">Riješeno</option>
        <option value="rejected">Odbijeno</option>
      </select>
      {reports.length === 0 ? <EmptyState title="Nema prijava." body="Kad neko prijavi sadržaj, pojaviće se ovdje." /> : null}
      <ul className="space-y-3">
        {reports.map((report) => (
          <li key={report.id} className="rounded-lg border border-line bg-paper p-4 text-sm">
            <p className="font-medium">{report.reportable_type} #{report.reportable_id} · {report.reason} · {report.status}</p>
            <p className="text-muted">{report.reporter?.name} · {formatDate(report.created_at)}</p>
            {report.description ? <p className="mt-2">{report.description}</p> : null}
            <div className="mt-3 flex flex-wrap gap-2">
              {([["reviewed", "Pregledano"], ["resolved", "Riješeno"], ["rejected", "Odbijeno"]] as const).map(([next, label]) => (
                <button key={next} type="button" className="min-h-11 rounded-md border border-line px-3" onClick={() => update(report, next)}>{label}</button>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
