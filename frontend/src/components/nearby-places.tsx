"use client";

import { VenueGrid } from "@/components/venue-card";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { HomePayload, Venue } from "@/types";
import { useEffect, useState } from "react";

export function NearbyPlaces({ initial }: { initial: Venue[] }) {
  const { token } = useAuth();
  const [venues, setVenues] = useState(initial);
  const [status, setStatus] = useState(initial.length ? "ready" : "idle");

  useEffect(() => {
    if (!navigator.geolocation || initial.length) return;
    setStatus("asking");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const response = await api<HomePayload>(
            `/home?lat=${position.coords.latitude}&lng=${position.coords.longitude}&radius_km=30`,
            { token },
          );
          setVenues(response.data.nearby);
          setStatus(response.data.nearby.length ? "ready" : "empty");
        } catch {
          setStatus("error");
        }
      },
      () => setStatus("denied"),
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }, [initial.length, token]);

  return (
    <section className="space-y-4">
      <h2 className="font-serif text-3xl">U blizini</h2>
      {status === "asking" ? <p className="text-sm text-muted">Tražimo mjesta oko vas…</p> : null}
      {status === "denied" ? <p className="text-sm text-muted">Lokacija nije uključena. Pretraga po gradu i dalje radi.</p> : null}
      {status === "empty" ? <p className="text-sm text-muted">U krugu od 30 km nema objavljenih mjesta.</p> : null}
      {status === "error" ? <p className="text-sm text-coral">Blizinu trenutno ne možemo učitati.</p> : null}
      {venues.length ? <VenueGrid venues={venues} /> : null}
    </section>
  );
}
