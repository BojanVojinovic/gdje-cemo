"use client";

import { useI18n } from "@/components/i18n-provider";
import { StatGridSkeleton } from "@/components/skeletons";
import { Button, useToast } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";

type Plan = {
  slug: string;
  name: string;
  summary: string;
  lines: string[];
  price_cents: number;
  venue_limit: number;
  staff_limit: number;
};

type Subscription = {
  status: string;
  provider: string;
  plan: string | null;
  started_at: string | null;
  cancelled_at: string | null;
};

type BusinessPlan = {
  id: number;
  name: string;
  venue_count: number;
  staff_count: number;
  subscription: Subscription | null;
};

type Catalog = {
  plans: Plan[];
  businesses: BusinessPlan[];
};

export default function BusinessPlansPage() {
  const { token, user, ready } = useAuth();
  const { t } = useI18n();
  const toast = useToast();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [businessId, setBusinessId] = useState<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !user || user.role === "customer") return;
    api<Catalog>("/business/plans", { token })
      .then((response) => {
        setCatalog(response.data);
        setBusinessId((current) => current ?? response.data.businesses[0]?.id ?? null);
      })
      .catch((reason) => setError(reason instanceof ApiError ? reason.message : t("plan.failed")));
  }, [token, user, t]);

  const business = catalog?.businesses.find((row) => row.id === businessId) ?? catalog?.businesses[0] ?? null;
  const active = business?.subscription?.status === "active" ? business.subscription.plan : null;

  async function choose(plan: Plan) {
    if (!token || !business) return;
    if (business.venue_count > plan.venue_limit && !window.confirm(t("plan.over", { count: business.venue_count, limit: plan.venue_limit }))) {
      return;
    }
    setBusy(plan.slug);
    try {
      const response = await api<Subscription>("/business/subscription", {
        method: "POST",
        token,
        body: { plan: plan.slug, business_id: business.id },
      });
      setCatalog((current) => current && {
        ...current,
        businesses: current.businesses.map((row) => row.id === business.id ? { ...row, subscription: response.data } : row),
      });
      toast(response.message ?? t("plan.done"));
      window.dispatchEvent(new CustomEvent("gdje-plan-changed"));
    } catch (reason) {
      toast(reason instanceof ApiError ? reason.message : t("plan.failed"));
    } finally {
      setBusy(null);
    }
  }

  async function cancel() {
    if (!token || !business) return;
    if (!window.confirm(t("plan.cancelAsk"))) return;
    setBusy("cancel");
    try {
      const response = await api<Subscription>("/business/subscription/cancel", {
        method: "POST",
        token,
        body: { business_id: business.id },
      });
      setCatalog((current) => current && {
        ...current,
        businesses: current.businesses.map((row) => row.id === business.id ? { ...row, subscription: response.data } : row),
      });
      toast(response.message ?? t("plan.cancelDone"));
      window.dispatchEvent(new CustomEvent("gdje-plan-changed"));
    } catch (reason) {
      toast(reason instanceof ApiError ? reason.message : t("plan.failed"));
    } finally {
      setBusy(null);
    }
  }

  if (!ready) return <StatGridSkeleton count={3} className="grid gap-3 md:grid-cols-3" />;
  if (user?.role === "customer") return <p className="text-sm text-muted">{t("plan.approvedOnly")}</p>;
  if (error) return <p className="text-coral">{error}</p>;
  if (!catalog) return <StatGridSkeleton count={3} className="grid gap-3 md:grid-cols-3" />;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-serif text-4xl text-ink">{t("plan.title")}</h1>
        <p className="max-w-2xl text-sm leading-6 text-ink/85">{t("plan.lead")}</p>
        <p className="max-w-2xl text-sm leading-6 text-muted">{t("plan.test")}</p>
      </div>

      {catalog.businesses.length > 1 ? (
        <label className="block max-w-sm space-y-1.5 text-sm">
          <span className="text-[0.8rem] font-semibold uppercase tracking-[0.08em] text-muted">{t("plan.business")}</span>
          <select
            className="h-11 w-full appearance-none rounded-lg border border-line bg-paper px-3 text-sm text-ink"
            value={business?.id ?? ""}
            onChange={(event) => setBusinessId(Number(event.target.value))}
          >
            {catalog.businesses.map((row) => (
              <option key={row.id} value={row.id}>{row.name}</option>
            ))}
          </select>
        </label>
      ) : business ? (
        <p className="text-sm text-ink">
          {t("plan.for", { name: business.name })}
          <span className="text-muted"> · {business.subscription?.status === "cancelled" ? t("plan.cancelled") : business.subscription ? t("plan.current") : t("plan.none")}</span>
        </p>
      ) : (
        <p className="text-sm text-muted">{t("plan.approvedOnly")}</p>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {catalog.plans.map((plan) => {
          const current = active === plan.slug;
          const over = business ? business.venue_count > plan.venue_limit : false;
          return (
            <article key={plan.slug} className={`flex flex-col border bg-paper p-5 ${current ? "border-sea" : "border-line"}`}>
              {current ? <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sea">{t("plan.current")}</p> : null}
              <h2 className={`font-serif text-3xl text-ink ${current ? "mt-2" : ""}`}>{plan.name}</h2>
              <p className="mt-3 font-serif text-4xl text-ink">€{Math.round(plan.price_cents / 100)} <span className="font-sans text-base text-muted">{t("plan.month")}</span></p>
              <p className="mt-3 text-sm leading-6 text-ink/85">{plan.summary}</p>
              <ul className="mt-4 flex-1 space-y-2 text-sm leading-6 text-ink/85">
                {plan.lines.map((line) => <li key={line}>{line}</li>)}
              </ul>
              {over ? <p className="mt-4 text-sm leading-6 text-muted">{t("plan.over", { count: business?.venue_count ?? 0, limit: plan.venue_limit })}</p> : null}
              <Button
                className="mt-5 w-full"
                variant={current ? "secondary" : "primary"}
                disabled={!business || current || busy !== null}
                loading={busy === plan.slug}
                onClick={() => choose(plan)}
              >
                {current ? t("plan.current") : active ? t("plan.switch") : t("plan.choose")}
              </Button>
            </article>
          );
        })}
      </div>

      {active ? (
        <Button variant="ghost" disabled={busy !== null} loading={busy === "cancel"} onClick={cancel}>
          {t("plan.cancel")}
        </Button>
      ) : null}
    </div>
  );
}
