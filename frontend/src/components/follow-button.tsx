"use client";

import { useI18n } from "@/components/i18n-provider";
import { Skeleton } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function FollowButton({ venueId }: { venueId: number }) {
  const { token, user, ready } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const [following, setFollowing] = useState(false);
  const [known, setKnown] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!token) {
      setKnown(true);
      return;
    }
    setKnown(false);
    api<{ following: boolean }>(`/venues/${venueId}/floor-plan`, { token })
      .then((response) => setFollowing(response.data.following))
      .catch(() => undefined)
      .finally(() => setKnown(true));
  }, [ready, token, venueId]);

  async function toggle() {
    if (!user || !token) {
      router.push("/login");
      return;
    }
    const response = await api<{ following: boolean }>(`/venues/${venueId}/follow`, {
      method: following ? "DELETE" : "POST",
      token,
    }).catch((error: unknown) => {
      if (error instanceof ApiError) return null;
      return null;
    });
    if (response) setFollowing(response.data.following);
  }

  if (!known) return <Skeleton className="h-11 w-36" />;

  return (
    <button type="button" onClick={() => void toggle()} className={`min-h-11 border px-4 text-sm font-semibold ${following ? "border-sea bg-sea text-snow" : "border-line bg-paper text-ink"}`}>
      {following ? t("follow.off") : t("follow.on")}
    </button>
  );
}
