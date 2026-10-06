"use client";

import { DashboardNav } from "@/components/dashboard-nav";
import { useI18n } from "@/components/i18n-provider";
import { RoleGate } from "@/components/role-gate";
import { useAuth } from "@/lib/auth";

export function BusinessFrame({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { t } = useI18n();
  const ownerGroups = [
    { title: t("business.overview"), links: [{ href: "/business", label: t("business.today") }] },
    { title: t("business.place"), links: [
      { href: "/business/venues", label: t("business.venues") },
      { href: "/business/venues/new", label: t("business.new") },
    ] },
    { title: t("business.guests"), links: [
      { href: "/business/reservations", label: t("business.reservations") },
      { href: "/business/sessions", label: t("business.orders") },
      { href: "/business/deliveries", label: t("business.deliveries") },
      { href: "/business/shifts", label: t("shift.title") },
    ] },
    { title: t("business.contentGroup"), links: [{ href: "/business/content", label: t("business.content") }] },
  ];
  const groups = user?.role === "customer"
    ? [{ title: t("nav.partners"), links: [{ href: "/business", label: t("business.request") }] }]
    : ownerGroups;

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 md:grid-cols-[220px_1fr]">
      <RoleGate allow={["customer", "business", "admin"]}>
        <aside className="md:sticky md:top-24 md:self-start">
          <DashboardNav title={t("nav.business")} groups={groups} />
        </aside>
        <div>{children}</div>
      </RoleGate>
    </div>
  );
}
