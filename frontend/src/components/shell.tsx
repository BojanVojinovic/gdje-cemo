"use client";

import { useI18n } from "@/components/i18n-provider";
import { useAuth } from "@/lib/auth";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function SiteHeader() {
  const { user, ready, logout } = useAuth();
  const { t, locale, setLocale } = useI18n();
  const links = [
    { href: "/places", label: t("nav.places") },
    { href: "/events", label: t("nav.events") },
    { href: "/saved", label: t("nav.saved") },
  ];
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
          <nav className="hidden items-center gap-7 text-sm font-semibold md:flex" aria-label={t("nav.main")}>
            {links.map((link) => (
              <Link key={link.href} href={link.href} className={pathname.startsWith(link.href) ? "text-sea" : "text-ink"}>
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            <LanguageSwitch locale={locale} setLocale={setLocale} />
            {user?.staff?.length ? <Link href="/staff" className="px-3 text-sm">{t("nav.staff")}</Link> : null}
            {user?.role === "customer" ? <Link href="/business" className="px-3 text-sm text-muted">{t("nav.partners")}</Link> : null}
            {user?.role === "business" || user?.role === "admin" ? <Link href="/business" className="px-3 text-sm">{t("nav.business")}</Link> : null}
            {user?.role === "admin" ? <Link href="/admin" className="px-3 text-sm">{t("nav.admin")}</Link> : null}
            {ready && user ? (
              <>
                <Link href="/profile" className="px-3 text-sm font-semibold">{user.first_name}</Link>
                <button type="button" onClick={onLogout} className="min-h-11 px-3 text-sm text-muted">{t("nav.logout")}</button>
              </>
            ) : (
              <>
                <Link href="/login" className="min-h-11 px-3 py-2 text-sm font-semibold">{t("nav.login")}</Link>
                <Link href="/register" className="inline-flex min-h-11 items-center rounded-full bg-sea px-4 text-sm font-semibold text-snow">{t("nav.account")}</Link>
              </>
            )}
          </div>
          <div className="flex items-center gap-1 md:hidden">
            <LanguageSwitch locale={locale} setLocale={setLocale} />
            <button type="button" className="min-h-11 min-w-11 text-sm font-semibold" aria-expanded={open} aria-label={t("nav.menu")} onClick={() => setOpen((value) => !value)}>
              {t("nav.menu")}
            </button>
          </div>
        </div>
      </header>
      {open ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button type="button" className="absolute inset-0 bg-black/60" aria-label={t("nav.close")} onClick={() => setOpen(false)} />
          <nav className="absolute inset-y-0 right-0 flex w-[min(20rem,88vw)] flex-col gap-1 overflow-y-auto border-l border-line bg-paper px-4 py-5" aria-label={t("nav.menu")}>
            <button type="button" className="mb-2 min-h-11 self-end px-2 text-sm text-muted" onClick={() => setOpen(false)}>{t("nav.close")}</button>
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="block min-h-11 py-2" onClick={() => setOpen(false)}>{link.label}</Link>
            ))}
            {user ? <Link href="/profile" className="block min-h-11 py-2" onClick={() => setOpen(false)}>{t("nav.profile")}</Link> : <Link href="/login" className="block min-h-11 py-2" onClick={() => setOpen(false)}>{t("nav.login")}</Link>}
            {user?.staff?.length ? <Link href="/staff" className="block min-h-11 py-2" onClick={() => setOpen(false)}>{t("nav.staff")}</Link> : null}
            {user?.role === "customer" ? <Link href="/business" className="block min-h-11 py-2" onClick={() => setOpen(false)}>{t("nav.partners")}</Link> : null}
            {user?.role === "business" || user?.role === "admin" ? <Link href="/business" className="block min-h-11 py-2" onClick={() => setOpen(false)}>{t("nav.business")}</Link> : null}
            {user?.role === "admin" ? <Link href="/admin" className="block min-h-11 py-2" onClick={() => setOpen(false)}>{t("nav.admin")}</Link> : null}
            {!user ? <Link href="/register" className="block min-h-11 py-2" onClick={() => setOpen(false)}>{t("nav.account")}</Link> : null}
            {user ? <button type="button" className="min-h-11 w-full text-left" onClick={onLogout}>{t("nav.logout")}</button> : null}
          </nav>
        </div>
      ) : null}
      {dashboard ? null : <MobileNav pathname={pathname} t={t} />}
    </>
  );
}

function MobileNav({ pathname, t }: { pathname: string; t: (key: string) => string }) {
  const items = [
    { href: "/", label: t("nav.home") },
    { href: "/places", label: t("nav.places") },
    { href: "/events", label: t("nav.events") },
    { href: "/saved", label: t("nav.saved") },
    { href: "/profile", label: t("nav.profile") },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-paper md:hidden" aria-label={t("nav.mobile")}>
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
  const { t } = useI18n();
  return (
    <footer className="mt-auto border-t border-line bg-void pb-16 text-snow md:pb-0">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-3">
        <div>
          <p className="font-serif text-3xl">Gdje ćemo</p>
          <p className="mt-3 max-w-xs text-sm text-snow/70">{t("footer.blurb")}</p>
        </div>
        <div className="space-y-2 text-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-snow/50">{t("footer.explore")}</p>
          <Link href="/places" className="block text-snow/85">{t("nav.places")}</Link>
          <Link href="/events" className="block text-snow/85">{t("nav.events")}</Link>
          <Link href="/saved" className="block text-snow/85">{t("nav.saved")}</Link>
        </div>
        <div className="space-y-2 text-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-snow/50">{t("footer.forVenues")}</p>
          <Link href="/business" className="block text-snow/85">{t("footer.panel")}</Link>
          <Link href="/register" className="block text-snow/85">{t("footer.openAccount")}</Link>
        </div>
      </div>
    </footer>
  );
}

function LanguageSwitch({ locale, setLocale }: { locale: "en" | "cnr"; setLocale: (locale: "en" | "cnr") => void }) {
  return (
    <div className="flex items-center text-xs font-semibold">
      <button type="button" className={`min-h-11 px-2 ${locale === "en" ? "text-sea" : "text-muted"}`} onClick={() => setLocale("en")}>EN</button>
      <button type="button" className={`min-h-11 px-2 ${locale === "cnr" ? "text-sea" : "text-muted"}`} onClick={() => setLocale("cnr")}>CG</button>
    </div>
  );
}
