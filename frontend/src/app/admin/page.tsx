"use client";

import { Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";

type Stats = {
  users: number;
  businesses: number;
  pending_businesses: number;
  venues: number;
  published_venues: number;
  reviews: number;
  pending_reports: number;
  favorites: number;
};

export default function AdminHome() {
  const { token } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    if (!token) return;
    api<Stats>("/admin/stats", { token }).then((response) => setStats(response.data)).catch(() => undefined);
  }, [token]);

  if (!stats) return <Skeleton className="h-40" />;

  const cards = [
    ["Korisnici", stats.users],
    ["Biznisi", stats.businesses],
    ["Čekaju odobrenje", stats.pending_businesses],
    ["Mjesta", stats.venues],
    ["Objavljena", stats.published_venues],
    ["Recenzije", stats.reviews],
    ["Prijave", stats.pending_reports],
    ["Sačuvano", stats.favorites],
  ];

  return (
    <div className="space-y-4">
      <h1 className="font-serif text-4xl">Platforma</h1>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(([label, value]) => (
          <div key={String(label)} className="border border-line bg-paper p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{label}</p>
            <p className="mt-2 font-serif text-4xl">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
