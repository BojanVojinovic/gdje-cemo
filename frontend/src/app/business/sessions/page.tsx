"use client";

import { InfoListSkeleton } from "@/components/skeletons";
import { Button, useToast } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatPrice } from "@/lib/format";
import { orderStatusLabel, when } from "@/lib/hospitality";
import { useEffect, useState } from "react";

type SessionRow = {
  id: number;
  status: string;
  party_size: number;
  table_name_snapshot: string;
  opened_at: string;
  venue?: { name: string };
  orders?: { id: number; status: string; items?: { name_snapshot: string; quantity: number; price_snapshot: number }[] }[];
  requests?: { id: number; type: string; status: string }[];
};

const orderStatuses = ["pending", "confirmed", "preparing", "served", "cancelled"] as const;

export default function SessionsPage() {
  const { token } = useAuth();
  const toast = useToast();
  const [rows, setRows] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!token) return;
    setLoading(true);
    try {
      const response = await api<SessionRow[]>("/business/sessions", { token });
      setRows(response.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load().catch(() => undefined); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-4">
      <h1 className="font-serif text-4xl">Narudžbine</h1>
      {loading ? <InfoListSkeleton /> : null}
      {!loading ? <ul className="space-y-3">
        {rows.map((session) => (
          <li key={session.id} className="rounded-lg border border-line bg-paper p-4">
            <p className="font-medium">{session.venue?.name} · {session.table_name_snapshot}</p>
            <p className="text-sm text-muted">{when(session.opened_at)} · {session.party_size} gostiju · {session.status === "active" ? "aktivna" : "zatvorena"}</p>
            {session.requests?.map((request) => (
              <div key={request.id} className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
                <p className="text-sm font-medium">{request.type === "bill" ? "Traži račun" : "Zove konobara"}</p>
                <Button variant="secondary" onClick={async () => {
                  if (!token) return;
                  await api(`/staff/requests/${request.id}/done`, { method: "POST", token });
                  toast(request.type === "bill" ? "Račun je zatvoren." : "Poziv je zatvoren.");
                  await load();
                }}>Gotovo</Button>
              </div>
            ))}
            {session.orders?.map((order) => (
              <div key={order.id} className="mt-3 border-t border-line pt-3">
                <p className="text-sm">Narudžbina #{order.id} · {orderStatusLabel[order.status] ?? order.status}</p>
                <ul className="text-sm text-muted">
                  {order.items?.map((item, index) => <li key={index}>{item.quantity} × {item.name_snapshot} · {formatPrice(Number(item.price_snapshot))}</li>)}
                </ul>
                <div className="mt-2 flex flex-wrap gap-2">
                  {orderStatuses.map((status) => (
                    <Button key={status} variant={order.status === status ? "primary" : "secondary"} onClick={async () => {
                      if (!token) return;
                      await api(`/business/orders/${order.id}`, { method: "PUT", token, body: { status } });
                      toast("Narudžbina je ažurirana.");
                      await load();
                    }}>{orderStatusLabel[status]}</Button>
                  ))}
                </div>
              </div>
            ))}
            {session.status === "active" ? (
              <Button className="mt-3" onClick={async () => {
                if (!token) return;
                await api(`/business/sessions/${session.id}/close`, { method: "POST", token });
                toast("Sesija je zatvorena.");
                await load();
              }}>Zatvori sesiju</Button>
            ) : null}
          </li>
        ))}
      </ul> : null}
    </div>
  );
}
