"use client";

import { DashboardNav } from "@/components/dashboard-nav";
import { RoleGate } from "@/components/role-gate";
import { useAuth } from "@/lib/auth";

const ownerGroups = [
  { title: "Pregled", links: [{ href: "/business", label: "Danas" }] },
  { title: "Mjesto", links: [
    { href: "/business/venues", label: "Moja mjesta" },
    { href: "/business/venues/new", label: "Novo mjesto" },
  ] },
  { title: "Gosti", links: [
    { href: "/business/reservations", label: "Rezervacije" },
    { href: "/business/sessions", label: "Narudžbine" },
  ] },
  { title: "Sadržaj", links: [{ href: "/business/content", label: "Kalendar i objave" }] },
];

export function BusinessFrame({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const groups = user?.role === "customer"
    ? [{ title: "Partner", links: [{ href: "/business", label: "Zahtjev" }] }]
    : ownerGroups;

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 md:grid-cols-[220px_1fr]">
      <RoleGate allow={["customer", "business", "admin"]}>
        <aside className="md:sticky md:top-24 md:self-start">
          <DashboardNav title="Biznis" groups={groups} />
        </aside>
        <div>{children}</div>
      </RoleGate>
    </div>
  );
}
