"use client";

import { useAuth } from "@/lib/auth";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const links = [
  { href: "/places", label: "Mjesta" },
  { href: "/events", label: "Događaji" },
  { href: "/saved", label: "Sačuvano" },
];

export function SiteHeader() {
  const { user, ready, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const dashboard = pathname.startsWith("/business") || pathname.startsWith("/admin");

  async function onLogout() {
    await logout();
    setOpen(false);
    router.push("/");
  }

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-void/90 backdrop-blur">
        <div className="mx-auto flex h-[4.25rem] max-w-6xl items-center justify-between gap-4 px-4">
          <Link href="/" className="font-serif text-[1.65rem] leading-none tracking-tight text-snow">Gdje ćemo</Link>
          <nav className="hidden items-center gap-7 text-sm font-semibold md:flex" aria-label="Glavna navigacija">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className={pathname.startsWith(link.href) ? "text-sea" : "text-ink"}>
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            {user?.role === "customer" ? <Link href="/business" className="px-3 text-sm text-muted">Za partnere</Link> : null}
            {user?.role === "business" || user?.role === "admin" ? <Link href="/business" className="px-3 text-sm">Biznis</Link> : null}
            {user?.role === "admin" ? <Link href="/admin" className="px-3 text-sm">Admin</Link> : null}
            {ready && user ? (
              <>
                <Link href="/profile" className="px-3 text-sm font-semibold">{user.first_name}</Link>
                <button type="button" onClick={onLogout} className="min-h-11 px-3 text-sm text-muted">Odjava</button>
              </>
            ) : (
              <>
                <Link href="/login" className="min-h-11 px-3 py-2 text-sm font-semibold">Prijava</Link>
                <Link href="/register" className="inline-flex min-h-11 items-center rounded-full bg-sea px-4 text-sm font-semibold text-snow">Nalog</Link>
              </>
            )}
          </div>
          <button type="button" className="min-h-11 min-w-11 text-sm font-semibold md:hidden" aria-expanded={open} aria-label="Meni" onClick={() => setOpen((value) => !value)}>
            {open ? "Zatvori" : "Meni"}
          </button>
        </div>
        {open ? (
          <div className="space-y-1 border-t border-line px-4 py-3 md:hidden">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="block min-h-11 py-2" onClick={() => setOpen(false)}>{link.label}</Link>
            ))}
            {user ? <Link href="/profile" className="block min-h-11 py-2" onClick={() => setOpen(false)}>Profil</Link> : <Link href="/login" className="block min-h-11 py-2" onClick={() => setOpen(false)}>Prijava</Link>}
            {user?.role === "business" || user?.role === "admin" ? <Link href="/business" className="block min-h-11 py-2" onClick={() => setOpen(false)}>Biznis</Link> : null}
            {user ? <button type="button" className="min-h-11 w-full text-left" onClick={onLogout}>Odjava</button> : null}
          </div>
        ) : null}
      </header>
      {dashboard ? null : <MobileNav pathname={pathname} />}
    </>
  );
}

function MobileNav({ pathname }: { pathname: string }) {
  const items = [
    { href: "/", label: "Početna" },
    { href: "/places", label: "Mjesta" },
    { href: "/events", label: "Događaji" },
    { href: "/saved", label: "Sačuvano" },
    { href: "/profile", label: "Profil" },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-paper md:hidden" aria-label="Mobilna navigacija">
      {items.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link key={item.href} href={item.href} className={`flex min-h-14 items-center justify-center text-[11px] font-semibold uppercase tracking-[0.06em] ${active ? "text-sea" : "text-muted"}`}>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line bg-void pb-16 text-snow md:pb-0">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-3">
        <div>
          <p className="font-serif text-3xl">Gdje ćemo</p>
          <p className="mt-3 max-w-xs text-sm text-snow/70">Vodič kroz restorane, kafiće i barove u Crnoj Gori. Radno vrijeme, meni i rezervacije dolaze od vlasnika.</p>
        </div>
        <div className="space-y-2 text-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-snow/50">Istraži</p>
          <Link href="/places" className="block text-snow/85">Mjesta</Link>
          <Link href="/events" className="block text-snow/85">Događaji</Link>
          <Link href="/saved" className="block text-snow/85">Sačuvano</Link>
        </div>
        <div className="space-y-2 text-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-snow/50">Za lokale</p>
          <Link href="/business" className="block text-snow/85">Biznis panel</Link>
          <Link href="/register" className="block text-snow/85">Otvori nalog</Link>
        </div>
      </div>
    </footer>
  );
}
