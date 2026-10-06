"use client";

import { TableListSkeleton } from "@/components/skeletons";
import { EmptyState } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { PageMeta, Venue } from "@/types";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function MyVenuesPage() {
  const { token } = useAuth();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    api<Venue[]>("/business/venues", { token })
      .then((response) => {
        setVenues(response.data);
        setMeta(response.meta ?? null);
      })
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="font-serif text-4xl">Moja mjesta</h1>
        <TableListSkeleton />
      </div>
    );
  }
  if (!venues.length) return <EmptyState title="Nemate mjesta." body="Dodajte prvi lokal da se pojavi u pretrazi." action={<Link href="/business/venues/new" className="text-sea">Novo mjesto</Link>} />;

  return (
    <div className="space-y-4">
      <h1 className="font-serif text-4xl">Moja mjesta</h1>
      <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-paper">
        {venues.map((venue) => (
          <li key={venue.id}>
            <Link href={`/business/venues/${venue.id}`} className="flex min-h-14 items-center justify-between px-4">
              <span>{venue.name}</span>
              <span className="text-sm text-muted">{venue.status} · {venue.rating_avg.toFixed(1)}</span>
            </Link>
          </li>
        ))}
      </ul>
      {meta ? <p className="text-sm text-muted">{meta.total} ukupno</p> : null}
    </div>
  );
}
