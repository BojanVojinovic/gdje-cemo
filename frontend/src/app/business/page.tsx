"use client";

import { StatGridSkeleton, TableListSkeleton } from "@/components/skeletons";
import { Button, EmptyState, Field, inputClass, useToast } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Venue } from "@/types";
import Link from "next/link";
import { useEffect, useState } from "react";

type Dashboard = {
  venues_count: number;
  profile_views: number;
  menu_views: number;
  reviews_count: number;
  favorites_count: number;
  rating_avg: number;
  venues: Venue[];
};

export default function BusinessHomePage() {
  const { token, user, ready } = useAuth();
  const toast = useToast();
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [application, setApplication] = useState<{ name: string; status: string; rejection_reason?: string | null } | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (!token || !user) return;
    if (user.role === "customer") {
      api<typeof application>("/business/application", { token }).then((response) => setApplication(response.data)).catch(() => undefined);
      return;
    }
    api<Dashboard>("/business/dashboard", { token })
      .then((response) => setData(response.data))
      .catch((reason) => setError(reason instanceof ApiError ? reason.message : "Pregled nije učitan."));
  }, [token, user]);

  async function apply(event: React.FormEvent) {
    event.preventDefault();
    if (!token) return;
    try {
      const response = await api("/business/apply", { method: "POST", token, body: { name, description, phone: phone || null } });
      toast(response.message ?? "Zahtjev je poslat.");
      setApplication({ name, status: "pending" });
    } catch (reason) {
      toast(reason instanceof ApiError ? reason.message : "Zahtjev nije poslat.");
    }
  }

  if (!ready) return <StatGridSkeleton count={5} className="grid gap-3 sm:grid-cols-3" />;
  if (!user) return <EmptyState title="Prijavite se." body="Biznis panel je dostupan prijavljenim korisnicima." />;

  if (user.role === "customer") {
    return (
      <div className="space-y-4">
        <h1 className="font-serif text-4xl">Biznis nalog</h1>
        {application ? <p className="rounded-lg bg-paper p-4 text-sm">Zahtjev „{application.name}“ je u statusu {application.status}.{application.rejection_reason ? ` ${application.rejection_reason}` : ""}</p> : null}
        <form onSubmit={apply} className="space-y-3 rounded-lg border border-line bg-paper p-5">
          <Field label="Naziv biznisa"><input className={inputClass} value={name} onChange={(event) => setName(event.target.value)} required /></Field>
          <Field label="Telefon"><input className={inputClass} value={phone} onChange={(event) => setPhone(event.target.value)} /></Field>
          <Field label="Opis"><textarea className={inputClass + " min-h-24 py-3"} value={description} onChange={(event) => setDescription(event.target.value)} /></Field>
          <Button type="submit">Zatraži pristup</Button>
        </form>
      </div>
    );
  }

  if (error) return <p className="text-coral">{error}</p>;
  if (!data) {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Danas</p>
          <h1 className="font-serif text-4xl">Pregled lokala</h1>
        </div>
        <StatGridSkeleton count={5} className="grid gap-3 sm:grid-cols-3" />
        <TableListSkeleton count={3} />
      </div>
    );
  }

  const stats = [
    ["Pregledi profila", data.profile_views],
    ["Pregledi menija", data.menu_views],
    ["Recenzije", data.reviews_count],
    ["Sačuvano", data.favorites_count],
    ["Prosjek", data.rating_avg.toFixed(2)],
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Danas</p>
        <h1 className="font-serif text-4xl">Pregled lokala</h1>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {stats.map(([label, value]) => (
          <div key={String(label)} className="border border-line bg-paper p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{label}</p>
            <p className="mt-2 font-serif text-4xl">{value}</p>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        {data.venues.map((venue) => (
          <Link key={venue.id} href={`/business/venues/${venue.id}`} className="flex items-center justify-between border border-line bg-paper px-4 py-3">
            <span>{venue.name}</span>
            <span className="text-sm text-muted">{venue.city} · {venue.status}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
