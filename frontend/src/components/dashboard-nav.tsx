"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type LinkItem = { href: string; label: string };
type Group = { title: string; links: LinkItem[] };

export function DashboardNav({ title, links, groups }: { title?: string; links?: LinkItem[]; groups?: Group[] }) {
  const pathname = usePathname();
  const sections = groups ?? (links ? [{ title: title ?? "Meni", links }] : []);

  return (
    <nav className="space-y-6" aria-label={title ?? "Panel"}>
      {sections.map((group) => (
        <div key={group.title} className="space-y-1">
          <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">{group.title}</p>
          {group.links.map((link) => {
            const active = link.href === "/business" || link.href === "/admin"
              ? pathname === link.href
              : pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link key={link.href} href={link.href} className={`block min-h-10 rounded-md px-3 py-2 text-sm ${active ? "bg-sea text-snow" : "text-ink hover:bg-snow/5"}`}>
                {link.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
