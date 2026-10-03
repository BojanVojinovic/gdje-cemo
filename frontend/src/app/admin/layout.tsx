import type { Metadata } from "next";
import { DashboardNav } from "@/components/dashboard-nav";
import { RoleGate } from "@/components/role-gate";

export const metadata: Metadata = { title: "Administracija", robots: { index: false, follow: false } };

const groups = [
  { title: "Pregled", links: [{ href: "/admin", label: "Kontrolna tabla" }] },
  { title: "Ljudi", links: [
    { href: "/admin/users", label: "Korisnici" },
    { href: "/admin/businesses", label: "Biznisi" },
  ] },
  { title: "Katalog", links: [
    { href: "/admin/venues", label: "Mjesta" },
    { href: "/admin/categories", label: "Kategorije" },
    { href: "/admin/reviews", label: "Recenzije" },
    { href: "/admin/content", label: "Sadržaj" },
  ] },
  { title: "Sistem", links: [
    { href: "/admin/reports", label: "Prijave" },
    { href: "/admin/settings", label: "Podešavanja" },
  ] },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
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
