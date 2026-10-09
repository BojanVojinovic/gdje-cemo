import { DashboardNav } from "@/components/dashboard-nav";
import { RoleGate } from "@/components/role-gate";
import { normalizeLocale, translate } from "@/lib/i18n";
import type { Metadata } from "next";
import { cookies } from "next/headers";

export async function generateMetadata(): Promise<Metadata> {
  const locale = normalizeLocale((await cookies()).get("gdje-locale")?.value);
  return { title: translate(locale, "admin.title"), robots: { index: false, follow: false } };
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const locale = normalizeLocale((await cookies()).get("gdje-locale")?.value);
  const t = (key: string) => translate(locale, key);
  const groups = [
    { title: t("admin.overview"), links: [{ href: "/admin", label: t("admin.dashboard") }] },
    { title: t("admin.people"), links: [
      { href: "/admin/users", label: t("admin.users") },
      { href: "/admin/businesses", label: t("admin.businesses") },
    ] },
    { title: t("admin.catalog"), links: [
      { href: "/admin/venues", label: t("admin.venues") },
      { href: "/admin/categories", label: t("admin.categories") },
      { href: "/admin/reviews", label: t("admin.reviews") },
      { href: "/admin/content", label: t("admin.content") },
    ] },
    { title: t("admin.system"), links: [
      { href: "/admin/reports", label: t("admin.reports") },
      { href: "/admin/settings", label: t("admin.settings") },
    ] },
  ];

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 md:grid-cols-[220px_1fr]">
      <RoleGate allow={["admin"]}>
        <aside className="md:sticky md:top-24 md:self-start">
          <DashboardNav title="Admin" groups={groups} />
        </aside>
        <div>{children}</div>
      </RoleGate>
    </div>
  );
}
