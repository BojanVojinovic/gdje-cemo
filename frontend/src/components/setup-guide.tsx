"use client";

import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Venue } from "@/types";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Fill = { type: string; title: string; body: string };

type Step = {
  target: string;
  tab?: string;
  href: (venueId: number | null) => string;
  fill?: Fill;
};

type Phase = { id: string; needs: string[]; addon?: string; steps: Step[] };

type PlanRow = { slug: string; features?: string[] };
type BusinessRow = { id: number; subscription: { status: string; plan: string | null } | null };
type Catalog = { plans: PlanRow[]; businesses: BusinessRow[] };

const listing = ["listing"];

const notice: Fill = {
  type: "announcement",
  title: "Večeras na terasi",
  body: "Od osam naveče svira uživo. Broj mjesta je ograničen.",
};

const eventExample: Fill = {
  type: "event",
  title: "Večera uz vino",
  body: "Četiri slijeda i čaša vina. Prijave su otvorene do podneva.",
};

function venueHref(path: string) {
  return (venueId: number | null) => (venueId ? `/business/venues/${venueId}${path}` : "/business/venues/new");
}

const phases: Phase[] = [
  {
    id: "basics",
    needs: listing,
    steps: ["basics-name", "basics-description", "basics-address", "basics-city", "basics-phone", "basics-category", "basics-price", "basics-save"].map((target) => ({
      target,
      tab: "info",
      href: venueHref(""),
    })),
  },
  {
    id: "hours",
    needs: listing,
    steps: ["hours-day", "hours-save"].map((target) => ({ target, tab: "hours", href: venueHref("") })),
  },
  {
    id: "photos",
    needs: listing,
    steps: ["photos-cover", "photos-gallery"].map((target) => ({ target, tab: "photos", href: venueHref("") })),
  },
  {
    id: "look",
    needs: listing,
    steps: ["look-tagline", "look-color", "look-logo", "look-save"].map((target) => ({ target, tab: "look", href: venueHref("") })),
  },
  {
    id: "menu",
    needs: listing,
    steps: ["menu-category", "menu-station", "menu-add", "menu-item"].map((target) => ({ target, tab: "menu", href: venueHref("") })),
  },
  {
    id: "bookings",
    needs: ["reservations"],
    steps: [
      { target: "bookings-date", href: () => "/business/reservations" },
      { target: "bookings-list", href: () => "/business/reservations" },
    ],
  },
  {
    id: "notice",
    needs: ["content"],
    steps: [
      { target: "notice-kind", href: () => "/business/content", fill: notice },
      { target: "notice-title", href: () => "/business/content" },
      { target: "notice-body", href: () => "/business/content" },
      { target: "notice-save", href: () => "/business/content" },
    ],
  },
  {
    id: "event",
    needs: ["content"],
    steps: [
      { target: "event-kind", href: () => "/business/content", fill: eventExample },
      { target: "event-title", href: () => "/business/content" },
      { target: "event-start", href: () => "/business/content" },
      { target: "event-save", href: () => "/business/content" },
    ],
  },
  {
    id: "floor",
    needs: ["floor"],
    steps: ["floor-tools", "floor-zone", "floor-canvas", "floor-save", "floor-bookings"].map((target) => ({ target, href: venueHref("/floor-plan") })),
  },
  {
    id: "staff",
    needs: ["staff"],
    steps: ["staff-email", "staff-roles", "staff-add"].map((target) => ({ target, tab: "staff", href: venueHref("") })),
  },
  {
    id: "delivery",
    needs: ["delivery"],
    steps: [{ target: "delivery-toggle", tab: "info", href: venueHref("") }],
  },
  {
    id: "loungers",
    needs: [],
    addon: "loungers",
    steps: ["lounger-zone", "lounger-price", "lounger-water", "lounger-add", "lounger-canvas"].map((target) => ({ target, href: venueHref("/loungers") })),
  },
];

const openFeatures = ["listing", "reservations", "floor", "delivery", "staff", "content", "analytics"];

function sameSet(left: string[], right: string[]) {
  return left.length === right.length && left.every((item) => right.includes(item));
}

function allowed(phase: Phase, features: string[], addons: string[]) {
  if (phase.addon && !addons.includes(phase.addon)) return false;
  return phase.needs.every((need) => features.includes(need));
}

function featuresFor(catalog: Catalog, businessId: number | null): string[] {
  const row = catalog.businesses.find((item) => item.id === businessId) ?? (catalog.businesses.length === 1 ? catalog.businesses[0] : null);
  if (!row) return openFeatures;
  if (!row.subscription) return openFeatures;
  if (row.subscription.status !== "active" || !row.subscription.plan) return ["listing", "reservations"];
  const plan = catalog.plans.find((item) => item.slug === row.subscription?.plan);
  return plan?.features?.length ? plan.features : ["listing", "reservations"];
}

type GuideState = {
  decision: "pending" | "later" | "started";
  venueId: number | null;
  done: string[];
  phase: string | null;
  step: number;
  knownFeatures: string[] | null;
  knownBusinessId: number | null;
  knownAddons: string[] | null;
};

const emptyState: GuideState = { decision: "pending", venueId: null, done: [], phase: null, step: 0, knownFeatures: null, knownBusinessId: null, knownAddons: null };

function storageKey(userId: number) {
  return `gdje-setup-guide:${userId}`;
}

export function SetupGuide() {
  const { user, token } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [state, setState] = useState<GuideState | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [pick, setPick] = useState("");
  const [upgrade, setUpgrade] = useState<string[] | null>(null);
  const scrolled = useRef("");

  const business = user?.role === "business";

  useEffect(() => {
    if (!user || !business) return;
    const raw = localStorage.getItem(storageKey(user.id));
    if (!raw) {
      setState(emptyState);
      return;
    }
    try {
      setState({ ...emptyState, ...JSON.parse(raw) });
    } catch {
      setState(emptyState);
    }
  }, [user, business]);

  useEffect(() => {
    if (!user || !state) return;
    localStorage.setItem(storageKey(user.id), JSON.stringify(state));
  }, [user, state]);

  useEffect(() => {
    if (!token || !business) return;
    api<Venue[]>("/business/venues?per_page=50", { token })
      .then((response) => {
        setVenues(response.data);
        setPick((current) => current || String(response.data[0]?.id ?? ""));
      })
      .catch(() => undefined);
    function reloadVenues() {
      api<Venue[]>("/business/venues?per_page=50", { token })
        .then((response) => setVenues(response.data))
        .catch(() => undefined);
    }
    window.addEventListener("gdje-plan-changed", reloadVenues);
    return () => window.removeEventListener("gdje-plan-changed", reloadVenues);
  }, [token, business]);

  useEffect(() => {
    if (!token || !business) return;
    let stop = false;
    function load() {
      api<Catalog>("/business/plans", { token })
        .then((response) => {
          if (!stop) setCatalog(response.data);
        })
        .catch(() => undefined);
    }
    load();
    window.addEventListener("gdje-plan-changed", load);
    window.addEventListener("focus", load);
    return () => {
      stop = true;
      window.removeEventListener("gdje-plan-changed", load);
      window.removeEventListener("focus", load);
    };
  }, [token, business, pathname]);

  const venueId = state?.venueId ?? (Number(pick) || null);
  const venue = venues.find((item) => item.id === venueId) ?? null;
  const businessId = venue?.business_id ?? venue?.business?.id ?? (catalog?.businesses.length === 1 ? catalog.businesses[0].id : null);
  const features = catalog ? featuresFor(catalog, businessId) : null;
  const addons = venue?.offers_loungers ? ["loungers"] : [];
  const visible = phases.filter((item) => (features ? allowed(item, features, addons) : item.needs.every((need) => need === "listing" || need === "reservations") && !item.addon));

  useEffect(() => {
    if (!state || !features || businessId == null || state.decision === "pending") return;
    const known = state.knownFeatures;
    const knownAddons = state.knownAddons;
    if (known === null || knownAddons === null || state.knownBusinessId !== businessId) {
      setState({ ...state, knownFeatures: features, knownAddons: addons, knownBusinessId: businessId });
      return;
    }
    if (sameSet(known, features) && sameSet(knownAddons, addons)) return;
    const fresh = phases.filter((item) => allowed(item, features, addons) && !allowed(item, known, knownAddons));
    if (fresh.length) {
      setUpgrade((current) => {
        const ids = fresh.map((item) => item.id);
        return current && sameSet(current, ids) ? current : ids;
      });
      return;
    }
    const currentPhase = phases.find((item) => item.id === state.phase);
    const phaseStill = currentPhase && allowed(currentPhase, features, addons) ? state.phase : null;
    setUpgrade(null);
    setState({ ...state, knownFeatures: features, knownAddons: addons, knownBusinessId: businessId, phase: phaseStill, step: phaseStill ? state.step : 0 });
  }, [state, features, businessId]);

  const phase = phases.find((item) => item.id === state?.phase) ?? null;
  const step = phase?.steps[state?.step ?? 0] ?? null;

  useEffect(() => {
    if (!step || !state) return;
    if (step.tab) {
      sessionStorage.setItem("gdje-setup-tab", step.tab);
      window.dispatchEvent(new CustomEvent("gdje-setup-tab", { detail: step.tab }));
    }
    if (step.fill) {
      sessionStorage.setItem("gdje-setup-fill", JSON.stringify(step.fill));
      window.dispatchEvent(new CustomEvent("gdje-setup-fill", { detail: step.fill }));
    }
    const href = step.href(state.venueId);
    if (pathname !== href) router.push(href);
  }, [step, state, pathname, router]);

  useEffect(() => {
    if (!step) {
      setRect(null);
      return;
    }
    const target = step.target;
    function measure(scroll: boolean) {
      const node = document.querySelector(`[data-setup="${target}"]`);
      if (!(node instanceof HTMLElement)) {
        setRect(null);
        return;
      }
      if (scroll && scrolled.current !== target) {
        node.scrollIntoView({ block: "center", inline: "nearest" });
        scrolled.current = target;
      }
      setRect(node.getBoundingClientRect());
      const focus = node.matches("input,textarea,select,button") ? node : node.querySelector("input,textarea,select");
      if (focus instanceof HTMLElement && document.activeElement !== focus) focus.focus({ preventScroll: true });
    }
    measure(true);
    const id = window.setInterval(() => measure(false), 400);
    const onMove = () => measure(false);
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [step, pathname]);

  if (!business || !state) return null;

  function update(next: GuideState) {
    setState(next);
  }

  function remember(next: GuideState): GuideState {
    if (!features || businessId == null) return next;
    return { ...next, knownFeatures: features, knownAddons: addons, knownBusinessId: businessId };
  }

  function start(phaseId: string, venueId = state?.venueId ?? (Number(pick || venues[0]?.id) || null)) {
    if (!visible.some((item) => item.id === phaseId)) return;
    scrolled.current = "";
    setListOpen(false);
    setUpgrade(null);
    update(remember({ ...state!, decision: "started", venueId, phase: phaseId, step: 0 }));
  }

  function stop() {
    setListOpen(false);
    update({ ...state!, phase: null, step: 0 });
  }

  function markDone() {
    const id = state!.phase;
    const done = id && !state!.done.includes(id) ? [...state!.done, id] : state!.done;
    setListOpen(true);
    update({ ...state!, done, phase: null, step: 0 });
  }

  const active = Boolean(step);
  const pad = 8;
  const hole = rect
    ? { top: Math.max(8, rect.top - pad), left: Math.max(8, rect.left - pad), width: rect.width + pad * 2, height: rect.height + pad * 2 }
    : null;

  return (
    <>
      {state.decision === "pending" ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div role="dialog" aria-labelledby="setup-offer-title" className="w-full max-w-md rounded-lg border border-line bg-paper p-6 text-ink shadow-[var(--shadow-card)]">
            <h2 id="setup-offer-title" className="font-serif text-3xl">{t("setup.offerTitle")}</h2>
            <p className="mt-3 text-sm text-muted">{t("setup.offerBody")}</p>
            {venues.length > 1 ? (
              <label className="mt-4 block text-sm">
                {t("setup.place")}
                <select value={pick} onChange={(event) => setPick(event.target.value)} className="mt-1 h-11 w-full rounded-lg border border-line bg-paper px-3 text-sm">
                  {venues.map((venue) => <option key={venue.id} value={venue.id}>{venue.name}</option>)}
                </select>
              </label>
            ) : null}
            <div className="mt-6 flex flex-wrap gap-2">
              <Button onClick={() => start("basics", Number(pick || venues[0]?.id) || null)}>{t("setup.accept")}</Button>
              <Button variant="secondary" onClick={() => update(remember({ ...state, decision: "later" }))}>{t("setup.decline")}</Button>
            </div>
          </div>
        </div>
      ) : null}

      {upgrade && state.decision !== "pending" ? (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div role="dialog" aria-labelledby="setup-upgrade-title" className="w-full max-w-md rounded-lg border border-line bg-paper p-6 text-ink shadow-[var(--shadow-card)]">
            <h2 id="setup-upgrade-title" className="font-serif text-3xl">{t("setup.upgradeTitle")}</h2>
            <p className="mt-3 text-sm text-muted">{t("setup.upgradeBody")}</p>
            <ul className="mt-3 space-y-1 text-sm">
              {upgrade.map((id) => <li key={id}>{t(`setup.phase.${id}`)}</li>)}
            </ul>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button onClick={() => start(upgrade[0])}>{t("setup.upgradeStart")}</Button>
              <Button variant="secondary" onClick={() => { setUpgrade(null); update(remember(state)); }}>{t("setup.decline")}</Button>
            </div>
          </div>
        </div>
      ) : null}

      {active && !upgrade && hole ? (
        <>
          <div className="fixed inset-x-0 top-0 z-[60] bg-black/45 backdrop-blur-sm" style={{ height: hole.top }} />
          <div className="fixed bottom-0 left-0 z-[60] bg-black/45 backdrop-blur-sm" style={{ top: hole.top, width: hole.left }} />
          <div className="fixed bottom-0 z-[60] bg-black/45 backdrop-blur-sm" style={{ top: hole.top, left: hole.left + hole.width, right: 0 }} />
          <div className="fixed inset-x-0 bottom-0 z-[60] bg-black/45 backdrop-blur-sm" style={{ top: hole.top + hole.height }} />
          <div className="pointer-events-none fixed z-[61] rounded-xl ring-2 ring-[#d4af6a]" style={{ top: hole.top, left: hole.left, width: hole.width, height: hole.height }} />
        </>
      ) : null}

      {active && !upgrade ? <Coach hole={hole} phaseId={phase!.id} step={step!} index={state.step} total={phase!.steps.length} onNext={() => {
        if (state.step + 1 < phase!.steps.length) {
          scrolled.current = "";
          update({ ...state, step: state.step + 1 });
        }
      }} onDone={markDone} onSkip={() => { setListOpen(true); update({ ...state, phase: null, step: 0 }); }} onStop={stop} /> : null}

      {state.decision !== "pending" ? (
        <button type="button" onClick={() => setListOpen((open) => !open)} className="fixed bottom-5 right-5 z-[80] inline-flex min-h-11 items-center rounded-full bg-sea px-5 text-sm font-semibold text-snow shadow-[var(--shadow-card)]">
          {t("setup.button")}
        </button>
      ) : null}

      {listOpen ? (
        <div className="fixed bottom-20 right-5 z-[90] max-h-[70vh] w-[min(22rem,calc(100vw-2.5rem))] overflow-y-auto rounded-lg border border-line bg-paper p-4 text-ink shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-serif text-2xl">{t("setup.parts")}</h2>
            <button type="button" className="text-sm text-muted" onClick={() => setListOpen(false)}>{t("setup.close")}</button>
          </div>
          <p className="mt-1 text-xs text-muted">{t("setup.progress", { done: visible.filter((item) => state.done.includes(item.id)).length, total: visible.length })}</p>
          <p className="mt-1 text-xs text-muted">{t("setup.againHint")}</p>
          <ul className="mt-3 space-y-2">
            {visible.map((item) => {
              const done = state.done.includes(item.id);
              return (
                <li key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2">
                  <span>
                    <span className="block text-sm font-semibold">{t(`setup.phase.${item.id}`)}</span>
                    <span className="text-xs text-muted">{done ? t("setup.done") : t("setup.notDone")}</span>
                  </span>
                  <button type="button" className="min-h-11 rounded-full px-3 text-sm font-semibold text-sea" onClick={() => start(item.id)}>
                    {done ? t("setup.again") : t("setup.open")}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </>
  );
}

function Coach({
  hole,
  phaseId,
  step,
  index,
  total,
  onNext,
  onDone,
  onSkip,
  onStop,
}: {
  hole: { top: number; left: number; width: number; height: number } | null;
  phaseId: string;
  step: Step;
  index: number;
  total: number;
  onNext: () => void;
  onDone: () => void;
  onSkip: () => void;
  onStop: () => void;
}) {
  const { t } = useI18n();
  const last = index + 1 === total;
  const viewH = typeof window === "undefined" ? 800 : window.innerHeight;
  const viewW = typeof window === "undefined" ? 1200 : window.innerWidth;
  const cardH = 210;
  const below = hole ? hole.top + hole.height + 12 : 96;
  const top = hole && below + cardH > viewH ? Math.max(16, hole.top - cardH - 12) : below;
  const left = hole ? Math.min(viewW - 340, Math.max(16, hole.left)) : 16;

  return (
    <div className="fixed z-[90] w-[min(20rem,calc(100vw-2rem))] rounded-lg border border-line bg-paper p-4 text-ink shadow-[var(--shadow-card)]" style={{ top, left }}>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{t(`setup.phase.${phaseId}`)} · {index + 1}/{total}</p>
      <p className="mt-2 text-sm">{hole ? t(`setup.step.${step.target}`) : t("setup.waiting")}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {last ? <Button onClick={onDone}>{t("setup.donePhase")}</Button> : <Button onClick={onNext}>{t("setup.next")}</Button>}
        <Button variant="secondary" onClick={onSkip}>{t("setup.skip")}</Button>
        <Button variant="ghost" onClick={onStop}>{t("setup.stop")}</Button>
      </div>
    </div>
  );
}
