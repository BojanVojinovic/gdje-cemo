"use client";

import { useAuth } from "@/lib/auth";
import Link from "next/link";

export function ReserveLink({ slug, className, children }: { slug: string; className?: string; children: React.ReactNode }) {
  const { user } = useAuth();
  return <Link href={user ? `/venue/${slug}/reserve` : "/login"} className={className}>{children}</Link>;
}
