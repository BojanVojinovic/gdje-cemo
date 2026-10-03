"use client";

import { EmptyState, Skeleton } from "@/components/ui";
import { VenueGrid } from "@/components/venue-card";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { PageMeta, Venue } from "@/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function SavedPage() {
  const { token, user, ready } = useAuth();
  const router = useRouter();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  useEffect(() => {
    if (!token) return;
    api<Venue[]>("/me/favorites", { token })
      .then((response) => {
        setVenues(response.data);
        setMeta(response.meta ?? null);
      })
      .finally(() => setLoading(false));
  }, [token]);

  if (!ready || loading) return <div className="mx-auto max-w-6xl px-4 py-10"><Skeleton className="h-64" /></div>;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-10">
      <h1 className="font-serif text-4xl">Sačuvana mjesta</h1>
      {venues.length === 0 ? (
        <EmptyState title="Još ništa nije sačuvano." body="Otvorite mjesto i pritisnite Sačuvaj." action={<Link href="/places" className="inline-flex min-h-11 items-center rounded-md bg-sea px-4 text-sm font-semibold text-snow">Pregledaj mjesta</Link>} />
      ) : (
        <>
          <VenueGrid venues={venues} />
          {meta ? <p className="text-sm text-muted">{meta.total} mjesta</p> : null}
        </>
      )}
    </div>
  );
}
