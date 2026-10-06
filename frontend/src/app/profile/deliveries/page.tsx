"use client";

import { useI18n } from "@/components/i18n-provider";
import { InfoListSkeleton } from "@/components/skeletons";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import Link from "next/link";
import { useEffect, useState } from "react";

type Delivery = {
  id: number;
  status: string;
  address: string;
  city: string;
  eta_minutes: number | null;
  total: number;
  venue: { name: string; slug: string } | null;
  items: { name: string; quantity: number }[];
};

const steps = ["received", "preparing", "in_transit", "arrived", "delivered"] as const;

export default function MyDeliveriesPage() {
  const { token, ready } = useAuth();
  const { t } = useI18n();
  const [rows, setRows] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      if (ready) setLoading(false);
      return;
    }
    let stop = false;
    async function load() {
      const response = await api<Delivery[]>("/me/deliveries", { token });
      if (!stop) setRows(response.data);
    }
    void load().finally(() => { if (!stop) setLoading(false); });
    const timer = window.setInterval(() => { void load().catch(() => undefined); }, 15000);
    return () => {
      stop = true;
      window.clearInterval(timer);
    };
  }, [token, ready]);

  if (!ready || loading) return <InfoListSkeleton />;

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-10">
      <Link href="/profile" className="text-sm text-sea">{t("nav.profile")}</Link>
      <h1 className="font-serif text-4xl">{t("delivery.mine")}</h1>
      {rows.length === 0 ? <p className="text-sm text-muted">{t("delivery.empty")}</p> : null}
      {rows.map((row) => (
        <article key={row.id} className="border border-line bg-paper p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-serif text-2xl">{row.venue?.name}</h2>
            <p className="text-sm font-semibold">{t(`status.${row.status}`)}</p>
          </div>
          <p className="mt-1 text-sm text-muted">{row.address}, {row.city}</p>
          {row.eta_minutes ? <p className="text-sm">{t("delivery.eta", { minutes: row.eta_minutes })}</p> : null}
          {row.status === "arrived" ? <p className="mt-2 text-sm font-medium">{t("delivery.pickUp")}</p> : null}
          <ol className="mt-3 flex flex-wrap gap-2 text-xs">
            {steps.map((step) => (
              <li key={step} className={step === row.status ? "font-semibold text-sea" : "text-muted"}>{t(`status.${step}`)}</li>
            ))}
          </ol>
          <ul className="mt-3 text-sm">
            {row.items.map((item, index) => <li key={index}>{item.quantity} × {item.name}</li>)}
          </ul>
          <p className="mt-2 text-sm">{row.total} €</p>
        </article>
      ))}
    </div>
  );
}
