"use client";

import { InfoListSkeleton } from "@/components/skeletons";
import { Button, useToast } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { orderStatusLabel } from "@/lib/hospitality";
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

type StaffVenue = {
  id: number;
  name: string;
  roles: string[];
  orders: StaffOrder[];
  requests: StaffRequest[];
};

const roleLabel: Record<string, string> = { waiter: "Konobar", bar: "Šank", kitchen: "Kuhinja" };
const stationLabel: Record<string, string> = { kitchen: "Kuhinja", bar: "Šank" };
const orderStatuses = ["pending", "confirmed", "preparing", "served", "cancelled"] as const;

export default function StaffPage() {
  const { token, user, ready } = useAuth();
  const toast = useToast();
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
      toast("Narudžbina je ažurirana.");
      await load();
    } catch (error) {
      toast(error instanceof ApiError ? error.message : "Status nije sačuvan.");
    }
  }

  async function closeRequest(id: number) {
    if (!token) return;
    await api(`/staff/requests/${id}/done`, { method: "POST", token });
    toast("Poziv je zatvoren.");
    await load();
  }

  if (!ready || (token && loading)) return <InfoListSkeleton />;
  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="font-serif text-4xl">Osoblje</h1>
        <p className="mt-3 text-sm text-muted">Prijavi se nalogom koji je lokal dodao kao konobara, šank ili kuhinju.</p>
        <Link href="/login" className="mt-4 inline-flex min-h-11 items-center text-sea">Prijava</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div className="flex items-end justify-between gap-3">
        <h1 className="font-serif text-4xl">Osoblje</h1>
        <Button variant="secondary" onClick={() => void load()}>Osvježi</Button>
      </div>
      {venues.length === 0 ? <p className="text-sm text-muted">Nisi dodijeljen nijednom lokalu.</p> : null}
      {venues.map((venue) => (
        <section key={venue.id} className="space-y-3">
          <header>
            <h2 className="font-serif text-2xl">{venue.name}</h2>
            <p className="text-sm text-muted">{venue.roles.map((role) => roleLabel[role] ?? role).join(", ")}</p>
          </header>
          {venue.requests.map((request) => (
            <div key={request.id} className="flex flex-wrap items-center justify-between gap-3 border border-line bg-paper p-4">
              <p className="text-sm font-medium">Sto {request.table} · {request.type === "bill" ? "Traži račun" : "Zove konobara"}</p>
              <Button variant="secondary" onClick={() => void closeRequest(request.id)}>Gotovo</Button>
            </div>
          ))}
          {venue.orders.length === 0 ? <p className="text-sm text-muted">Nema otvorenih narudžbina za tvoju stanicu.</p> : null}
          {venue.orders.map((order) => (
            <article key={order.id} className="border border-line bg-paper p-4">
              <p className="font-medium">Sto {order.table} · {orderStatusLabel[order.status] ?? order.status}</p>
              {order.notes ? <p className="mt-1 text-sm text-muted">{order.notes}</p> : null}
              <ul className="mt-2 text-sm">
                {order.items.map((item, index) => (
                  <li key={index}>{item.quantity} × {item.name} · {stationLabel[item.station] ?? item.station}</li>
                ))}
              </ul>
              <div className="mt-3 flex flex-wrap gap-2">
                {orderStatuses.map((status) => (
                  <Button key={status} variant={order.status === status ? "primary" : "secondary"} onClick={() => void setStatus(order.id, status)}>
                    {orderStatusLabel[status]}
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
