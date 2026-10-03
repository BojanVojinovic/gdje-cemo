"use client";

import { Button, EmptyState, useToast } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { reservationStatusLabel, when } from "@/lib/hospitality";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type ReservationRow = {
  id: number;
  party_size: number;
  start_at: string;
  end_at: string;
  status: string;
  table_name: string;
  zone_name: string | null;
  venue?: { name: string; slug: string };
};

export default function MyReservationsPage() {
  const { token, user, ready } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [rows, setRows] = useState<ReservationRow[]>([]);

  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  useEffect(() => {
    if (!token) return;
    api<ReservationRow[]>("/me/reservations", { token }).then((response) => setRows(response.data)).catch(() => undefined);
  }, [token]);

  async function cancel(id: number) {
    if (!token) return;
    try {
      await api(`/reservations/${id}/cancel`, { method: "POST", token });
      toast("Rezervacija je otkazana.");
      const response = await api<ReservationRow[]>("/me/reservations", { token });
      setRows(response.data);
    } catch (reason) {
      toast(reason instanceof ApiError ? (reason.errors?.status?.[0] || reason.message) : "Otkazivanje nije uspjelo.");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-10">
      <Link href="/profile" className="text-sm text-sea">Profil</Link>
      <h1 className="font-serif text-4xl">Moje rezervacije</h1>
      <ul className="space-y-3">
        {rows.map((row) => (
          <li key={row.id} className="rounded-lg border border-line bg-paper p-4">
            <p className="font-medium">{row.venue?.name}</p>
            <p className="text-sm">{when(row.start_at)} – {when(row.end_at)}</p>
            <p className="text-sm text-muted">{row.table_name}{row.zone_name ? ` · ${row.zone_name}` : ""} · {row.party_size} gostiju · {reservationStatusLabel[row.status] ?? row.status}</p>
            {row.venue ? <Link href={`/venue/${row.venue.slug}`} className="text-sm text-sea">Mjesto</Link> : null}
            {row.status === "pending" || row.status === "confirmed" ? <Button className="mt-3" variant="secondary" onClick={() => void cancel(row.id)}>Otkaži</Button> : null}
          </li>
        ))}
      </ul>
      {rows.length === 0 ? <EmptyState title="Nemate rezervacija." body="Izaberite mjesto i zakažite sto za večeru." action={<Link href="/places" className="text-sm font-semibold text-sea">Pronađi mjesto</Link>} /> : null}
    </div>
  );
}
