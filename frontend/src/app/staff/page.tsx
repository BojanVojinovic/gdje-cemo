"use client";

import { useI18n } from "@/components/i18n-provider";
import { InfoListSkeleton } from "@/components/skeletons";
import { Button, inputClass, useToast } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import Link from "next/link";
import { useEffect, useState } from "react";

type StaffOrder = {
  id: number;
  status: string;
  notes: string | null;
  table: string;
  items: { name: string; quantity: number; station: string }[];
};

type StaffRequest = { id: number; type: string; table: string | null };

type StaffDelivery = {
  id: number;
  status: string;
  address: string;
  city: string;
  phone: string;
  notes: string | null;
  eta_minutes: number | null;
  customer: string;
  items: { name: string; quantity: number; station: string }[];
};

type StaffVenue = {
  id: number;
  name: string;
  roles: string[];
  orders: StaffOrder[];
  requests: StaffRequest[];
  deliveries?: StaffDelivery[];
};

const orderStatuses = ["pending", "confirmed", "preparing", "served", "cancelled"] as const;
const deliveryStatuses = ["received", "preparing", "in_transit", "arrived", "delivered", "cancelled"] as const;

export default function StaffPage() {
  const { token, user, ready } = useAuth();
  const { t } = useI18n();
  const toast = useToast();
  const [eta, setEta] = useState<Record<number, string>>({});
  const [venues, setVenues] = useState<StaffVenue[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!token) return;
    try {
      const response = await api<{ venues: StaffVenue[] }>("/staff/board", { token });
      setVenues(response.data.venues);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!ready || !token) {
      if (ready) setLoading(false);
      return;
    }
    void load().catch(() => setLoading(false));
    const timer = window.setInterval(() => { void load().catch(() => undefined); }, 15000);
    return () => window.clearInterval(timer);
  }, [ready, token]); // eslint-disable-line react-hooks/exhaustive-deps

  async function setStatus(orderId: number, status: string) {
    if (!token) return;
    try {
      await api(`/staff/orders/${orderId}`, { method: "PUT", token, body: { status } });
      toast(t("staff.updated"));
      await load();
    } catch (error) {
      toast(error instanceof ApiError ? error.message : t("api.failed"));
    }
  }

  async function setDelivery(id: number, status: string) {
    if (!token) return;
    const minutes = Number(eta[id]);
    try {
      await api(`/staff/deliveries/${id}`, {
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

  async function closeRequest(id: number) {
    if (!token) return;
    await api(`/staff/requests/${id}/done`, { method: "POST", token });
    toast(t("staff.closed"));
    await load();
  }

  if (!ready || (token && loading)) return <InfoListSkeleton />;
  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="font-serif text-4xl">{t("staff.title")}</h1>
        <p className="mt-3 text-sm text-muted">{t("staff.loginHint")}</p>
        <Link href="/login" className="mt-4 inline-flex min-h-11 items-center text-sea">{t("nav.login")}</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div className="flex items-end justify-between gap-3">
        <h1 className="font-serif text-4xl">{t("staff.title")}</h1>
        <div className="flex gap-2">
          <Link href="/profile/shifts" className="inline-flex min-h-11 items-center text-sm text-sea">{t("shift.mine")}</Link>
          <Button variant="secondary" onClick={() => void load()}>{t("staff.refresh")}</Button>
        </div>
      </div>
      {venues.length === 0 ? <p className="text-sm text-muted">{t("staff.none")}</p> : null}
      {venues.map((venue) => (
        <section key={venue.id} className="space-y-3">
          <header>
            <h2 className="font-serif text-2xl">{venue.name}</h2>
            <p className="text-sm text-muted">{venue.roles.map((role) => t(`staff.role.${role}`)).join(", ")}</p>
          </header>
          {venue.requests.map((request) => (
            <div key={request.id} className="flex flex-wrap items-center justify-between gap-3 border border-line bg-paper p-4">
              <p className="text-sm font-medium">{t("staff.table")} {request.table} · {request.type === "bill" ? t("staff.bill") : t("staff.call")}</p>
              <Button variant="secondary" onClick={() => void closeRequest(request.id)}>{t("staff.done")}</Button>
            </div>
          ))}
          {(venue.deliveries ?? []).map((delivery) => (
            <article key={`d-${delivery.id}`} className="border border-line bg-paper p-4">
              <p className="font-medium">{t("staff.deliveries")} · {delivery.customer} · {t(`status.${delivery.status}`)}</p>
              <p className="text-sm">{delivery.address}, {delivery.city} · {delivery.phone}</p>
              {delivery.notes ? <p className="mt-1 text-sm text-muted">{delivery.notes}</p> : null}
              <ul className="mt-2 text-sm">
                {delivery.items.map((item, index) => (
                  <li key={index}>{item.quantity} × {item.name} · {t(`staff.role.${item.station}`)}</li>
                ))}
              </ul>
              <label className="mt-3 block text-sm">
                {t("staff.eta")}
                <input className={`${inputClass} mt-1 w-28`} inputMode="numeric" value={eta[delivery.id] ?? String(delivery.eta_minutes ?? "")} onChange={(event) => setEta({ ...eta, [delivery.id]: event.target.value })} />
              </label>
              <div className="mt-3 flex flex-wrap gap-2">
                {deliveryStatuses.map((status) => (
                  <Button key={status} variant={delivery.status === status ? "primary" : "secondary"} onClick={() => void setDelivery(delivery.id, status)}>
                    {t(`status.${status}`)}
                  </Button>
                ))}
              </div>
            </article>
          ))}
          {venue.orders.length === 0 && (venue.deliveries ?? []).length === 0 ? <p className="text-sm text-muted">{t("staff.noOrders")}</p> : null}
          {venue.orders.map((order) => (
            <article key={order.id} className="border border-line bg-paper p-4">
              <p className="font-medium">{t("staff.table")} {order.table} · {t(`status.${order.status}`)}</p>
              {order.notes ? <p className="mt-1 text-sm text-muted">{order.notes}</p> : null}
              <ul className="mt-2 text-sm">
                {order.items.map((item, index) => (
                  <li key={index}>{item.quantity} × {item.name} · {t(`staff.role.${item.station}`)}</li>
                ))}
              </ul>
              <div className="mt-3 flex flex-wrap gap-2">
                {orderStatuses.map((status) => (
                  <Button key={status} variant={order.status === status ? "primary" : "secondary"} onClick={() => void setStatus(order.id, status)}>
                    {t(`status.${status}`)}
                  </Button>
                ))}
              </div>
            </article>
          ))}
        </section>
      ))}
    </div>
  );
}
