"use client";

import { Button, useToast } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SaveButton({ venueId, initialSaved }: { venueId: number; initialSaved: boolean }) {
  const { token, user } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [saved, setSaved] = useState(initialSaved);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    if (!user || !token) {
      router.push("/login");
      return;
    }
    const next = !saved;
    setSaved(next);
    setLoading(true);
    try {
      await api(next ? `/venues/${venueId}/favorite` : `/venues/${venueId}/favorite`, {
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

  return (
    <Button variant={saved ? "primary" : "secondary"} onClick={toggle} loading={loading} aria-pressed={saved}>
      {saved ? "Sačuvano" : "Sačuvaj"}
    </Button>
  );
}
