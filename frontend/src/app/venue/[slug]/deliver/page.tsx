"use client";

import { useI18n } from "@/components/i18n-provider";
import { InfoListSkeleton } from "@/components/skeletons";
import { Button, Field, inputClass, useToast } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { brandButtonStyle } from "@/lib/brand";
import { useAuth } from "@/lib/auth";
import type { VenueDetail } from "@/types";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function DeliverPage() {
  const params = useParams<{ slug: string }>();
  const { token, user, ready } = useAuth();
  const { t } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const [venue, setVenue] = useState<VenueDetail["venue"] | null>(null);
  const [qty, setQty] = useState<Record<number, number>>({});
  const [form, setForm] = useState({ address: "", city: "", phone: "", notes: "" });
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api<VenueDetail>(`/venues/${params.slug}`)
      .then((response) => {
        setVenue(response.data.venue);
        setForm((current) => ({ ...current, city: response.data.venue.city, phone: user?.phone ?? "" }));
      })
      .catch(() => setVenue(null))
      .finally(() => setLoading(false));
  }, [params.slug, user?.phone]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!token || !venue) return;
    const items = Object.entries(qty)
      .filter(([, quantity]) => quantity > 0)
      .map(([id, quantity]) => ({ menu_item_id: Number(id), quantity }));
    if (!items.length) return;
    setSending(true);
    try {
      const response = await api<{ id: number }>(`/venues/${venue.id}/deliveries`, {
        method: "POST",
        token,
        body: { ...form, items },
      });
      toast(response.message ?? t("delivery.submit"));
      router.push("/profile/deliveries");
    } catch (error) {
      toast(error instanceof ApiError ? error.message : t("api.failed"));
    } finally {
      setSending(false);
    }
  }

  if (loading) return <InfoListSkeleton />;
  if (!venue) return null;
  if (!venue.offers_delivery) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <p>{t("delivery.off")}</p>
        <Link href={`/venue/${venue.slug}`} className="text-sea">{venue.name}</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <Link href={`/venue/${venue.slug}`} className="text-sm text-sea">{venue.name}</Link>
      <h1 className="font-serif text-4xl">{t("delivery.title")}</h1>
      {venue.delivery_eta_minutes ? <p className="text-sm text-muted">{t("delivery.eta", { minutes: venue.delivery_eta_minutes })}</p> : null}
      {!ready || !user ? <p className="text-sm">{t("delivery.login")} <Link href="/login" className="text-sea">{t("nav.login")}</Link></p> : null}
      <form onSubmit={submit} className="space-y-4">
        {(venue.menu?.categories ?? []).map((category) => (
          <section key={category.id}>
            <h2 className="font-serif text-2xl">{category.name}</h2>
            <ul className="mt-2 space-y-2">
              {(category.items ?? []).filter((item) => item.is_available).map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 border border-line bg-paper px-3 py-2">
                  <span className="text-sm">{item.name} · {item.price} €</span>
                  <input
                    type="number"
                    min={0}
                    max={8}
                    className={`${inputClass} w-20`}
                    value={qty[item.id] ?? 0}
                    onChange={(event) => setQty({ ...qty, [item.id]: Number(event.target.value) })}
                  />
                </li>
              ))}
            </ul>
          </section>
        ))}
        <Field label={t("delivery.address")}><input className={inputClass} required value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></Field>
        <Field label={t("delivery.city")}><input className={inputClass} required value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} /></Field>
        <Field label={t("delivery.phone")}><input className={inputClass} required value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></Field>
        <Field label={t("delivery.notes")}><textarea className={`${inputClass} min-h-24 py-3`} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></Field>
        <Button type="submit" loading={sending} disabled={!user} style={brandButtonStyle(venue.brand_color, venue.brand_ink)}>{t("delivery.submit")}</Button>
      </form>
    </div>
  );
}
