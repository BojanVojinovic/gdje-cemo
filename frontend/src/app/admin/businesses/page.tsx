"use client";

import { ComboBox } from "@/components/combo-box";
import { useI18n } from "@/components/i18n-provider";
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
  const { t } = useI18n();
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
    if (!token || !window.confirm(t("biz.approveAsk"))) return;
    await api(`/admin/businesses/${id}/approve`, { method: "POST", token });
    toast(t("biz.approved"));
    await load();
  }

  async function reject(id: number) {
    if (!token) return;
    try {
      await api(`/admin/businesses/${id}/reject`, { method: "POST", token, body: { reason: reason[id] || t("biz.defaultReason") } });
      toast(t("biz.rejectedToast"));
      await load();
    } catch (error) {
      toast(error instanceof ApiError ? error.message : t("biz.rejectFailed"));
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="font-serif text-4xl">{t("admin.businesses")}</h1>
      <div className="max-w-xs">
        <ComboBox ariaLabel={t("biz.filter")} value={status} onChange={(value) => { setStatus(value); void load(value); }} options={[
          { value: "", label: t("biz.all") },
          { value: "pending", label: t("rsv.pending") },
          { value: "approved", label: t("biz.approvedOpt") },
          { value: "rejected", label: t("biz.rejectedOpt") },
        ]} />
      </div>
      {loading ? <InfoListSkeleton /> : null}
      {!loading && rows.length === 0 ? <EmptyState title={t("biz.empty")} body={t("biz.emptyHint")} /> : null}
      {!loading ? <ul className="space-y-3">
        {rows.map((row) => (
          <li key={row.id} className="rounded-lg border border-line bg-paper p-4">
            <p className="font-medium">{row.name} · {row.status}</p>
            <p className="text-sm text-muted">{row.owner?.name} · {row.owner?.email} · {t("biz.places", { n: row.venues_count })}</p>
            <p className="mt-2 text-sm">{row.description}</p>
            {row.status === "pending" ? (
              <div className="mt-3 space-y-2">
                <Field label={t("biz.rejectReason")}><input className={inputClass} value={reason[row.id] ?? ""} onChange={(event) => setReason({ ...reason, [row.id]: event.target.value })} /></Field>
                <div className="flex gap-2">
                  <Button onClick={() => approve(row.id)}>{t("biz.approve")}</Button>
                  <Button variant="danger" onClick={() => reject(row.id)}>{t("reserve.reject")}</Button>
                </div>
              </div>
            ) : null}
          </li>
        ))}
      </ul> : null}
    </div>
  );
}
