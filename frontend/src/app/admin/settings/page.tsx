"use client";

import { useI18n } from "@/components/i18n-provider";
import { SettingsFormSkeleton } from "@/components/skeletons";
import { Button, Field, inputClass, useToast } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Promotion } from "@/types";
import { useEffect, useState } from "react";

export default function AdminSettingsPage() {
  const { token } = useAuth();
  const { t } = useI18n();
  const toast = useToast();
  const [settings, setSettings] = useState({ site_name: "", tagline: "", support_email: "", default_city: "" });
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [link, setLink] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!token) return;
    setLoading(true);
    try {
      const [settingsResponse, promotionsResponse] = await Promise.all([
        api<typeof settings>("/admin/settings", { token }),
        api<Promotion[]>("/admin/promotions", { token }),
      ]);
      setSettings({ ...settings, ...settingsResponse.data });
      setPromotions(promotionsResponse.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load().catch(() => undefined); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!token) return;
    try {
      await api("/admin/settings", { method: "PUT", token, body: settings });
      toast("Podešavanja su sačuvana.");
    } catch (error) {
      toast(error instanceof ApiError ? error.message : "Čuvanje nije uspjelo.");
    }
  }

  async function addPromotion(event: React.FormEvent) {
    event.preventDefault();
    if (!token) return;
    await api("/admin/promotions", { method: "POST", token, body: { title, subtitle, link_url: link, is_active: true } });
    setTitle("");
    setSubtitle("");
    setLink("");
    await load();
  }

  async function remove(promotion: Promotion) {
    if (!token || !window.confirm("Obrisati promociju?")) return;
    await api(`/admin/promotions/${promotion.id}`, { method: "DELETE", token });
    await load();
  }

  return (
    <div className="space-y-8">
      <h1 className="font-serif text-4xl">Podešavanja</h1>
      {loading ? <SettingsFormSkeleton /> : <form onSubmit={save} className="space-y-3 rounded-lg border border-line bg-paper p-5">
        <Field label="Naziv sajta"><input className={inputClass} value={settings.site_name} onChange={(event) => setSettings({ ...settings, site_name: event.target.value })} /></Field>
        <Field label="Rečenica"><input className={inputClass} value={settings.tagline} onChange={(event) => setSettings({ ...settings, tagline: event.target.value })} /></Field>
        <Field label="Email podrške"><input className={inputClass} type="email" value={settings.support_email} onChange={(event) => setSettings({ ...settings, support_email: event.target.value })} /></Field>
        <Field label="Podrazumijevani grad"><input className={inputClass} value={settings.default_city} onChange={(event) => setSettings({ ...settings, default_city: event.target.value })} /></Field>
        <Button type="submit">{t("action.save")}</Button>
      </form>}
      {!loading ? <section className="space-y-3">
        <h2 className="font-serif text-2xl">Istaknuti sadržaj</h2>
        <form onSubmit={addPromotion} className="grid gap-2 md:grid-cols-3">
          <input className={inputClass} value={title} onChange={(event) => setTitle(event.target.value)} placeholder={t("content.title")} required />
          <input className={inputClass} value={subtitle} onChange={(event) => setSubtitle(event.target.value)} placeholder={t("field.subtitle")} />
          <input className={inputClass} value={link} onChange={(event) => setLink(event.target.value)} placeholder="/venue/konoba-galeb" />
          <Button type="submit">{t("action.add")}</Button>
        </form>
        <ul className="space-y-2">
          {promotions.map((promotion) => (
            <li key={promotion.id} className="flex items-center justify-between rounded-2xl bg-paper px-4 py-3 text-sm">
              <span>{promotion.title}</span>
              <button type="button" className="text-coral" onClick={() => remove(promotion)}>{t("action.delete")}</button>
            </li>
          ))}
        </ul>
      </section> : null}
    </div>
  );
}
