"use client";

import { TableOrderSkeleton } from "@/components/skeletons";
import { Button, Field, inputClass, useToast } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatPrice } from "@/lib/format";
import { orderStatusLabel, orderSteps } from "@/lib/hospitality";
import type { Menu, MenuCategory } from "@/types";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type GuestPass = { token: string; sessionId: number };

function guestKey(qr: string) {
  return `gdje-table-guest:${qr}`;
}

function readGuest(qr: string): GuestPass | null {
  try {
    const raw = window.sessionStorage.getItem(guestKey(qr));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GuestPass;
    return parsed.token && parsed.sessionId ? parsed : null;
  } catch {
    return null;
  }
}

function explain(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    const detail = error.errors ? Object.values(error.errors).flat()[0] : undefined;
    return detail || error.message || fallback;
  }
  return fallback;
}

type Scan = {
  table: { id: number; name: string; zone: string | null; is_orderable: boolean };
  venue: { id: number; name: string; slug: string };
  session_id: number | null;
};

type PlacedItem = { name: string; quantity: number; price: number };
type PlacedOrder = { id: number; status: string; items: PlacedItem[] };

export default function TableOrderPage() {
  const params = useParams<{ token: string }>();
  const { token } = useAuth();
  const toast = useToast();
  const [scan, setScan] = useState<Scan | null>(null);
  const [missing, setMissing] = useState(false);
  const [menu, setMenu] = useState<MenuCategory[]>([]);
  const [qty, setQty] = useState<Record<number, number>>({});
  const [notes, setNotes] = useState("");
  const [placed, setPlaced] = useState<PlacedOrder[]>([]);
  const [sending, setSending] = useState(false);
  const [calling, setCalling] = useState<"waiter" | "bill" | null>(null);

  useEffect(() => {
    api<Scan>(`/tables/qr/${params.token}`)
      .then(async (response) => {
        setScan(response.data);
        const categories = await api<Menu | null>(`/venues/${response.data.venue.id}/menu`);
        setMenu(categories.data?.categories ?? []);
      })
      .catch(() => setMissing(true));
  }, [params.token]);

  const lines = useMemo(
    () => menu.flatMap((category) => category.items ?? []).filter((item) => (qty[item.id] ?? 0) > 0),
    [menu, qty],
  );
  const count = lines.reduce((sum, item) => sum + (qty[item.id] ?? 0), 0);
  const total = lines.reduce((sum, item) => sum + Number(item.price) * (qty[item.id] ?? 0), 0);

  function changeQty(id: number, next: number) {
    setQty((current) => ({ ...current, [id]: Math.max(0, Math.min(8, next)) }));
  }

  async function ensureGuest(): Promise<GuestPass> {
    const saved = readGuest(params.token);
    const response = await api<{ session_id: number; guest_token: string }>(`/tables/qr/${params.token}/session`, {
      method: "POST",
      token: token ?? undefined,
      body: saved ? { guest_token: saved.token } : undefined,
    });
    const pass = { token: response.data.guest_token, sessionId: response.data.session_id };
    window.sessionStorage.setItem(guestKey(params.token), JSON.stringify(pass));
    return pass;
  }

  async function send() {
    if (!scan) return;
    const items = lines.map((item) => ({ menu_item_id: item.id, quantity: qty[item.id] }));
    if (!items.length) {
      toast("Izaberite bar jednu stavku.");
      return;
    }
    if (count > 24) {
      toast("Najviše 24 komada u jednoj narudžbini.");
      return;
    }
    setSending(true);
    try {
      const pass = await ensureGuest();
      const response = await api<{ id: number; status: string; items: { name_snapshot: string; quantity: number; price_snapshot: number }[] }>(`/sessions/${pass.sessionId}/orders`, {
        method: "POST",
        token: token ?? undefined,
        body: { notes, items, guest_token: pass.token },
      });
      setPlaced((current) => [
        {
          id: response.data.id,
          status: response.data.status,
          items: response.data.items.map((item) => ({ name: item.name_snapshot, quantity: item.quantity, price: Number(item.price_snapshot) })),
        },
        ...current,
      ]);
      toast("Narudžbina je poslata.");
      setQty({});
      setNotes("");
    } catch (reason) {
      const message = explain(reason, "Narudžbina nije poslata.");
      if (message.includes("zatvorena")) {
        window.sessionStorage.removeItem(guestKey(params.token));
      }
      toast(message);
    } finally {
      setSending(false);
    }
  }

  async function callStaff(type: "waiter" | "bill") {
    if (!scan) return;
    setCalling(type);
    try {
      const pass = await ensureGuest();
      const response = await api(`/sessions/${pass.sessionId}/service`, {
        method: "POST",
        token: token ?? undefined,
        body: { type, guest_token: pass.token },
      });
      toast(response.message || (type === "bill" ? "Zahtjev za račun je poslat." : "Konobar je obaviješten."));
    } catch (reason) {
      const message = explain(reason, "Poziv nije poslat.");
      if (message.includes("zatvorena")) {
        window.sessionStorage.removeItem(guestKey(params.token));
      }
      toast(message);
    } finally {
      setCalling(null);
    }
  }

  if (missing) return <p className="mx-auto max-w-3xl px-4 py-10">QR kod nije aktivan.</p>;
  if (!scan) return <TableOrderSkeleton />;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 pb-36">
      <header className="border-b border-line pb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{scan.venue.name}{scan.table.zone ? ` · ${scan.table.zone}` : ""}</p>
        <h1 className="font-serif text-4xl">Sto {scan.table.name}</h1>
        <p className="mt-1 text-sm text-muted">Meni · Korpa · Trenutna narudžbina</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => void callStaff("waiter")} loading={calling === "waiter"} disabled={calling !== null || sending}>Pozovi konobara</Button>
          <Button variant="secondary" onClick={() => void callStaff("bill")} loading={calling === "bill"} disabled={calling !== null || sending}>Plati račun</Button>
        </div>
      </header>
      {!scan.table.is_orderable ? <p>Ovaj sto trenutno ne prima narudžbine.</p> : null}
      {placed.map((order) => (
        <section key={order.id} className="border border-line bg-paper p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Narudžbina #{order.id}</p>
          <ol className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
            {orderSteps.map((step, index) => {
              const current = orderSteps.indexOf(order.status as (typeof orderSteps)[number]);
              const done = current >= index;
              return (
                <li key={step} className={done ? "font-semibold text-sea" : "text-muted"}>
                  <span className="block text-base" aria-hidden="true">{done ? "●" : "○"}</span>
                  {orderStatusLabel[step]}
                </li>
              );
            })}
          </ol>
          <ul className="mt-3 space-y-1 text-sm">
            {order.items.map((item, index) => <li key={index}>{item.quantity} × {item.name}</li>)}
          </ul>
        </section>
      ))}
      {menu.length ? (
        <nav aria-label="Kategorije" className="sticky top-[4.25rem] z-10 -mx-4 flex gap-2 overflow-x-auto bg-cream/95 px-4 py-2">
          {menu.map((category) => (
            <a key={category.id} href={`#sto-${category.id}`} className="shrink-0 border border-line bg-paper px-3 py-2 text-sm font-semibold">{category.name}</a>
          ))}
        </nav>
      ) : null}
      {menu.map((category) => (
        <section key={category.id} id={`sto-${category.id}`} className="scroll-mt-28">
          <h2 className="border-b border-line pb-2 font-serif text-2xl">{category.name}</h2>
          <ul>
            {category.items?.map((item) => {
              const amount = qty[item.id] ?? 0;
              return (
                <li key={item.id} className="flex items-center justify-between gap-3 border-b border-line py-3">
                  <div className="min-w-0">
                    <p className={item.is_available ? "font-semibold" : "font-semibold text-muted line-through"}>{item.name}</p>
                    {item.description ? <p className="text-sm text-muted">{item.description}</p> : null}
                    <p className="text-sm">{formatPrice(Number(item.price))}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" aria-label={`Smanji ${item.name}`} disabled={!item.is_available || amount === 0} className="h-11 w-11 border border-line bg-paper text-lg disabled:opacity-40" onClick={() => changeQty(item.id, amount - 1)}>−</button>
                    <span className="w-6 text-center text-sm font-semibold" aria-live="polite">{amount}</span>
                    <button type="button" aria-label={`Dodaj ${item.name}`} disabled={!item.is_available} className="h-11 w-11 border border-line bg-paper text-lg disabled:opacity-40" onClick={() => changeQty(item.id, amount + 1)}>+</button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      <Field label="Napomena"><textarea className={inputClass + " min-h-20 py-2"} value={notes} onChange={(event) => setNotes(event.target.value)} /></Field>
      <div className="fixed inset-x-0 bottom-14 z-20 border-t border-line bg-paper px-4 py-3 md:bottom-0">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">{count} {count === 1 ? "stavka" : "stavki"}</p>
            <p className="text-sm text-muted">{formatPrice(total)}</p>
          </div>
          <Button onClick={() => void send()} loading={sending} disabled={!scan.table.is_orderable || count === 0}>Pošalji narudžbinu</Button>
        </div>
      </div>
    </div>
  );
}
