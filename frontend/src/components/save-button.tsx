"use client";

import { Button, Skeleton, useToast } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { VenueDetail } from "@/types";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function SaveButton({ venueId, slug }: { venueId: number; slug: string }) {
  const { token, user, ready } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [saved, setSaved] = useState(false);
  const [known, setKnown] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!token) {
      setSaved(false);
      setKnown(true);
      return;
    }
    let cancel = false;
    setKnown(false);
    api<VenueDetail>(`/venues/${slug}`, { token })
      .then((response) => {
        if (!cancel) setSaved(Boolean(response.data.venue.is_saved));
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancel) setKnown(true);
      });
    return () => {
      cancel = true;
    };
  }, [ready, token, slug]);

  async function toggle() {
    if (!user || !token) {
      router.push("/login");
      return;
    }
    const next = !saved;
    setSaved(next);
    setLoading(true);
    try {
      await api(`/venues/${venueId}/favorite`, {
        method: next ? "POST" : "DELETE",
        token,
      });
      toast(next ? "Mjesto je sačuvano." : "Uklonjeno iz sačuvanih.");
    } catch (error) {
      setSaved(!next);
      toast(error instanceof ApiError ? error.message : "Čuvanje nije uspjelo.");
    } finally {
      setLoading(false);
    }
  }

  if (!known) return <Skeleton className="h-11 w-32 rounded-full" />;

  return (
    <Button variant={saved ? "primary" : "secondary"} onClick={toggle} loading={loading} aria-pressed={saved}>
      {saved ? "Sačuvano" : "Sačuvaj"}
    </Button>
  );
}
