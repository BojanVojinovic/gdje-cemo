"use client";

import { BrandMark } from "@/components/brand-mark";
import { useI18n } from "@/components/i18n-provider";
import { PwaInstall } from "@/components/pwa-install";
import { useAuth } from "@/lib/auth";
import { brandName } from "@/lib/brand-name";
import { api } from "@/lib/api";
import { locales, type Locale } from "@/lib/i18n";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function SiteHeader() {
  const { user, ready, logout, token } = useAuth();
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
          <Link href="/" className="flex items-center gap-2.5 text-ink">
            <BrandMark className="size-8 shrink-0" />
            <span className="font-serif text-[1.55rem] leading-none tracking-tight whitespace-nowrap">{brandName}</span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-semibold md:flex" aria-label={t("nav.main")}>
            {links.map((link) => (
              <Link key={link.href} href={link.href} className={pathname.startsWith(link.href) ? "text-sea" : "text-ink"}>
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            <LanguageSwitch locale={locale} token={token} setLocale={setLocale} />
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
            <LanguageSwitch locale={locale} token={token} setLocale={setLocale} />
            <button type="button" className="min-h-11 min-w-11 text-sm font-semibold" aria-expanded={open} aria-label={t("nav.menu")} onClick={() => setOpen((value) => !value)}>
              {t("nav.menu")}
            </button>
          </div>
        </div>
      </header>
      <PwaInstall />
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
    <footer className="mt-auto border-t border-line bg-void pb-16 text-ink md:pb-0">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-3">
        <div>
          <div className="flex items-center gap-3">
            <BrandMark className="size-11 shrink-0" />
            <p className="font-serif text-3xl leading-none">{brandName}</p>
          </div>
          <p className="mt-3 max-w-xs text-sm text-ink/70">{t("footer.blurb")}</p>
        </div>
        <div className="space-y-2 text-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/50">{t("footer.explore")}</p>
          <Link href="/places" className="block text-ink/85">{t("nav.places")}</Link>
          <Link href="/events" className="block text-ink/85">{t("nav.events")}</Link>
          <Link href="/saved" className="block text-ink/85">{t("nav.saved")}</Link>
        </div>
        <div className="space-y-2 text-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/50">{t("footer.forVenues")}</p>
          <Link href="/business" className="block text-ink/85">{t("footer.panel")}</Link>
          <Link href="/register" className="block text-ink/85">{t("footer.openAccount")}</Link>
        </div>
      </div>
    </footer>
  );
}

function LanguageSwitch({ locale, token, setLocale }: { locale: Locale; token: string | null; setLocale: (locale: Locale) => void }) {
  const { t } = useI18n();

  async function choose(next: Locale) {
    if (token && next !== locale) {
      await api("/me/locale", { method: "PUT", token, body: { locale: next } }).catch(() => undefined);
    }
    setLocale(next);
  }

  return (
    <label className="relative inline-flex min-h-11 items-center">
      <span className="sr-only">{t("copy.languages")}</span>
      <select
        value={locale}
        aria-label={t("copy.languages")}
        onChange={(event) => void choose(event.target.value as Locale)}
        className="h-11 appearance-none rounded-lg border border-line bg-paper pl-3 pr-9 text-xs font-semibold text-ink"
      >
        {locales.map((code) => (
          <option key={code} value={code}>{t(`lang.${code}`)}</option>
        ))}
      </select>
      <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="pointer-events-none absolute right-3 size-4 text-muted">
        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" clipRule="evenodd" />
      </svg>
    </label>
  );
}
