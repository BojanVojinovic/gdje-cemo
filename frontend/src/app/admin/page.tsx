"use client";

import { AnalyticsBoard, type AnalyticsPayload } from "@/components/analytics-board";
import { StatGridSkeleton } from "@/components/skeletons";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";

export default function AdminHome() {
  const { token } = useAuth();
  const [days, setDays] = useState(30);
  const [data, setData] = useState<AnalyticsPayload | null>(null);

  useEffect(() => {
    if (!token) return;
    api<AnalyticsPayload>(`/admin/analytics?days=${days}`, { token })
      .then((response) => setData(response.data))
      .catch(() => undefined);
  }, [token, days]);

  if (!data) {
    return (
      <div className="space-y-4">
        <StatGridSkeleton count={8} />
      </div>
    );
  }

  return <AnalyticsBoard data={data} days={days} onDays={setDays} />;
}
