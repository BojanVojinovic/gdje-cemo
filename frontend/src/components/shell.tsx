"use client";

import { useAuth } from "@/lib/auth";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

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
            {user?.staff?.length ? <Link href="/staff" className="px-3 text-sm">Osoblje</Link> : null}
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
            Meni
          </button>
        </div>
      </header>
      {open ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button type="button" className="absolute inset-0 bg-black/60" aria-label="Zatvori meni" onClick={() => setOpen(false)} />
          <nav className="absolute inset-y-0 right-0 flex w-[min(20rem,88vw)] flex-col gap-1 overflow-y-auto border-l border-line bg-paper px-4 py-5" aria-label="Meni">
            <button type="button" className="mb-2 min-h-11 self-end px-2 text-sm text-muted" onClick={() => setOpen(false)}>Zatvori</button>
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="block min-h-11 py-2" onClick={() => setOpen(false)}>{link.label}</Link>
            ))}
            {user ? <Link href="/profile" className="block min-h-11 py-2" onClick={() => setOpen(false)}>Profil</Link> : <Link href="/login" className="block min-h-11 py-2" onClick={() => setOpen(false)}>Prijava</Link>}
            {user?.staff?.length ? <Link href="/staff" className="block min-h-11 py-2" onClick={() => setOpen(false)}>Osoblje</Link> : null}
            {user?.role === "customer" ? <Link href="/business" className="block min-h-11 py-2" onClick={() => setOpen(false)}>Za partnere</Link> : null}
            {user?.role === "business" || user?.role === "admin" ? <Link href="/business" className="block min-h-11 py-2" onClick={() => setOpen(false)}>Biznis</Link> : null}
            {user?.role === "admin" ? <Link href="/admin" className="block min-h-11 py-2" onClick={() => setOpen(false)}>Admin</Link> : null}
            {!user ? <Link href="/register" className="block min-h-11 py-2" onClick={() => setOpen(false)}>Nalog</Link> : null}
            {user ? <button type="button" className="min-h-11 w-full text-left" onClick={onLogout}>Odjava</button> : null}
          </nav>
        </div>
      ) : null}
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
