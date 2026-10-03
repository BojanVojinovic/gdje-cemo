"use client";

import { Skeleton } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function RoleGate({ allow, children }: { allow: Array<"customer" | "business" | "admin">; children: React.ReactNode }) {
  const { user, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!allow.includes(user.role)) router.replace("/");
  }, [allow, ready, router, user]);

  if (!ready || !user || !allow.includes(user.role)) return <Skeleton className="h-40" />;
  return <div className="contents">{children}</div>;
}
