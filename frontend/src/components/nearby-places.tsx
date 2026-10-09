"use client";

import { useI18n } from "@/components/i18n-provider";
import { VenueGrid } from "@/components/venue-card";
import { VenueGridSkeleton } from "@/components/skeletons";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { HomePayload, Venue } from "@/types";
import { useEffect, useState } from "react";

export function NearbyPlaces({ initial }: { initial: Venue[] }) {
  const { token } = useAuth();
  const { t } = useI18n();
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
      <h2 className="font-serif text-3xl">{t("home.nearby")}</h2>
      {status === "asking" || status === "idle" ? <VenueGridSkeleton count={3} /> : null}
      {status === "denied" ? <p className="text-sm text-muted">{t("home.locationOff")}</p> : null}
      {status === "empty" ? <p className="text-sm text-muted">{t("nearby.empty")}</p> : null}
      {status === "error" ? <p className="text-sm text-coral">{t("nearby.error")}</p> : null}
      {venues.length ? <VenueGrid venues={venues} /> : null}
    </section>
  );
}
