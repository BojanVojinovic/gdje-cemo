"use client";

import { ComboBox } from "@/components/combo-box";
import { InfoListSkeleton } from "@/components/skeletons";
import { EmptyState, useToast } from "@/components/ui";
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
  const [loading, setLoading] = useState(true);

  async function load(next = status) {
    if (!token) return;
    setLoading(true);
    try {
      const response = await api<Report[]>(`/admin/reports?status=${next}`, { token });
      setReports(response.data);
    } finally {
      setLoading(false);
    }
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
      <div className="max-w-xs">
        <ComboBox ariaLabel="Status prijave" value={status} onChange={(value) => { setStatus(value); void load(value); }} options={[
          { value: "", label: "Sve" },
          { value: "pending", label: "Na čekanju" },
          { value: "reviewed", label: "Pregledano" },
          { value: "resolved", label: "Riješeno" },
          { value: "rejected", label: "Odbijeno" },
        ]} />
      </div>
      {loading ? <InfoListSkeleton /> : null}
      {!loading && reports.length === 0 ? <EmptyState title="Nema prijava." body="Kad neko prijavi sadržaj, pojaviće se ovdje." /> : null}
      {!loading ? <ul className="space-y-3">
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
      </ul> : null}
    </div>
  );
}
