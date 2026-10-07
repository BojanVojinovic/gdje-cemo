"use client";

import { useAuth } from "@/lib/auth";
import Link from "next/link";
import type { CSSProperties } from "react";

export function ReserveLink({ slug, className, style, children }: { slug: string; className?: string; style?: CSSProperties; children: React.ReactNode }) {
  const { user } = useAuth();
  return <Link href={user ? `/venue/${slug}/reserve` : "/login"} className={className} style={style}>{children}</Link>;
}
