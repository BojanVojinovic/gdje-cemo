"use client";

import { useI18n } from "@/components/i18n-provider";
import { InfoListSkeleton } from "@/components/skeletons";
import { Button, inputClass, useToast } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Venue } from "@/types";
import { useEffect, useState } from "react";

type Delivery = {
  id: number;
  status: string;
  address: string;
  city: string;
  phone: string;
  notes: string | null;
  eta_minutes: number | null;
  customer: string | null;
  venue?: { id: number; name: string } | null;
  items: { name: string; quantity: number; station: string }[];
};

const statuses = ["received", "preparing", "in_transit", "arrived", "delivered", "cancelled"] as const;

export default function BusinessDeliveriesPage() {
  const { token } = useAuth();
  const { t } = useI18n();
  const toast = useToast();
  const [rows, setRows] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [eta, setEta] = useState<Record<number, string>>({});

  async function load() {
    if (!token) return;
    const venues = (await api<Venue[]>("/business/venues", { token })).data;
    const lists = await Promise.all(venues.map(async (venue) => {
      const response = await api<Delivery[]>(`/business/venues/${venue.id}/deliveries`, { token });
      return response.data.map((row) => ({ ...row, venue: row.venue ?? { id: venue.id, name: venue.name } }));
    }));
    setRows(lists.flat());
  }

  useEffect(() => {
    if (!token) return;
    void load().catch(() => undefined).finally(() => setLoading(false));
    const timer = window.setInterval(() => { void load().catch(() => undefined); }, 15000);
    return () => window.clearInterval(timer);
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  async function update(id: number, status: string) {
    if (!token) return;
    const minutes = Number(eta[id]);
    try {
      await api(`/business/deliveries/${id}`, {
        method: "PUT",
        token,
        body: { status, eta_minutes: minutes >= 5 ? minutes : undefined },
      });
      toast(t("staff.updated"));
      await load();
    } catch (error) {
      toast(error instanceof ApiError ? error.message : t("api.failed"));
    }
  }

  if (loading) return <InfoListSkeleton />;

  return (
    <div className="space-y-4">
      <h1 className="font-serif text-4xl">{t("business.deliveries")}</h1>
      {rows.length === 0 ? <p className="text-sm text-muted">{t("delivery.empty")}</p> : null}
      {rows.map((row) => (
        <article key={row.id} className="border border-line bg-paper p-4">
          <p className="font-medium">{row.venue?.name} · {row.customer}</p>
          <p className="text-sm">{row.address}, {row.city} · {row.phone}</p>
          {row.notes ? <p className="text-sm text-muted">{row.notes}</p> : null}
          <ul className="mt-2 text-sm">
            {row.items.map((item, index) => <li key={index}>{item.quantity} × {item.name}</li>)}
          </ul>
          <label className="mt-3 block text-sm">
            {t("staff.eta")}
            <input className={`${inputClass} mt-1 w-28`} inputMode="numeric" value={eta[row.id] ?? String(row.eta_minutes ?? "")} onChange={(event) => setEta({ ...eta, [row.id]: event.target.value })} />
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            {statuses.map((status) => (
              <Button key={status} variant={row.status === status ? "primary" : "secondary"} onClick={() => void update(row.id, status)}>
                {t(`status.${status}`)}
              </Button>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}
