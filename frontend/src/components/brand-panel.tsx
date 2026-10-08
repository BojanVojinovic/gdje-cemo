"use client";

import { useI18n } from "@/components/i18n-provider";
import { CopyEditor, type CopyBag } from "@/components/locale-tabs";
import { Button, Field, inputClass, useToast } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { brandButtonStyle } from "@/lib/brand";
import { useAuth } from "@/lib/auth";
import type { Venue } from "@/types";
import { useState } from "react";

export function BrandPanel({ venue, onChange }: { venue: Venue; onChange: () => Promise<void> }) {
  const { token } = useAuth();
  const { t } = useI18n();
  const toast = useToast();
  const [tagline, setTagline] = useState(venue.source?.tagline ?? venue.tagline ?? "");
  const [translations, setTranslations] = useState<CopyBag>((venue.translations ?? {}) as CopyBag);
  const [useColor, setUseColor] = useState(Boolean(venue.brand_color));
  const [color, setColor] = useState(venue.brand_color || "#c45c26");
  const [saving, setSaving] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!token) return;
    setSaving(true);
    try {
      await api(`/business/venues/${venue.id}`, {
        method: "PUT",
        token,
        body: {
          tagline: tagline.trim() || null,
          brand_color: useColor ? color : null,
          translations: taglineCopy(translations),
        },
      });
      toast(t("brand.saved"));
      await onChange();
    } catch (error) {
      toast(error instanceof ApiError ? error.message : t("brand.failed"));
    } finally {
      setSaving(false);
    }
  }

  async function upload(file: File) {
    if (!token) return;
    const data = new FormData();
    data.append("image", file);
    try {
      await api(`/business/venues/${venue.id}/logo`, { method: "POST", token, formData: data });
      toast(t("brand.uploaded"));
      await onChange();
    } catch (error) {
      toast(error instanceof ApiError ? error.message : t("brand.failed"));
    }
  }

  async function clearLook() {
    if (!token) return;
    setTagline("");
    setTranslations({});
    setUseColor(false);
    setSaving(true);
    try {
      await api(`/business/venues/${venue.id}`, {
        method: "PUT",
        token,
        body: {
          tagline: null,
          brand_color: null,
          translations: taglineCopy(Object.fromEntries(["en", "ru", "it", "de", "fr", "es"].map((code) => [code, { tagline: "" }])) as CopyBag),
        },
      });
      toast(t("brand.saved"));
      await onChange();
    } catch (error) {
      toast(error instanceof ApiError ? error.message : t("brand.failed"));
    } finally {
      setSaving(false);
    }
  }

  async function removeLogo() {
    if (!token) return;
    await api(`/business/venues/${venue.id}/logo`, { method: "DELETE", token });
    toast(t("brand.removed"));
    await onChange();
  }

  const preview = useColor ? color : null;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_16rem]">
      <form onSubmit={save} className="space-y-4">
        <div>
          <h2 className="font-serif text-2xl">{t("brand.title")}</h2>
          <p className="mt-1 text-sm text-muted">{t("brand.lead")}</p>
        </div>
        <CopyEditor
          fields={[{ id: "tagline", label: t("brand.tagline"), required: false }]}
          source={{ tagline }}
          setSource={(_id, value) => setTagline(value.slice(0, 160))}
          bag={translations}
          setBag={setTranslations}
        />
        <p className="text-xs text-muted">{t("brand.taglineHint")}</p>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={useColor} onChange={(event) => setUseColor(event.target.checked)} />
          {t("brand.useColor")}
        </label>
        {useColor ? (
          <Field label={t("brand.color")}>
            <input type="color" className="h-11 w-24 cursor-pointer bg-paper" value={color} onChange={(event) => setColor(event.target.value)} />
          </Field>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" loading={saving}>{t("brand.save")}</Button>
          <Button type="button" variant="secondary" onClick={() => void clearLook()}>{t("brand.reset")}</Button>
        </div>
        <div className="space-y-2 border border-line bg-paper p-4">
          <p className="text-sm font-semibold">{t("brand.logo")}</p>
          <p className="text-xs text-muted">{t("brand.logoHint")}</p>
          {venue.logo_url ? <img src={venue.logo_url} alt="" className="h-16 w-16 rounded-xl border border-line object-contain" /> : null}
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex min-h-11 cursor-pointer items-center rounded-full border border-line px-4 text-sm font-semibold">
              {t("brand.upload")}
              <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void upload(file);
                event.target.value = "";
              }} />
            </label>
            {venue.logo_url ? <Button type="button" variant="secondary" onClick={() => void removeLogo()}>{t("brand.remove")}</Button> : null}
          </div>
        </div>
      </form>
      <div className="border border-line bg-paper p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{venue.city}</p>
        <div className="mt-3 flex items-center gap-3">
          {venue.logo_url ? <img src={venue.logo_url} alt="" className="h-12 w-12 rounded-xl border border-line object-contain" /> : null}
          <div>
            <p className="font-serif text-2xl leading-tight">{venue.name}</p>
            {tagline.trim() ? <p className="text-sm text-muted">{tagline.trim()}</p> : null}
          </div>
        </div>
        <span className="mt-4 inline-flex min-h-11 items-center rounded-full bg-sea px-5 text-sm font-semibold text-snow" style={brandButtonStyle(preview, preview ? (luma(preview) > 0.62 ? "#07090f" : "#f7f9ff") : null)}>
          {t("venue.reserve")}
        </span>
      </div>
    </div>
  );
}

function taglineCopy(bag: CopyBag): CopyBag {
  const next: CopyBag = {};
  (["en", "ru", "it", "de", "fr", "es"] as const).forEach((code) => {
    if (bag[code] && "tagline" in bag[code]) next[code] = { tagline: bag[code].tagline ?? "" };
  });
  return next;
}

function luma(hex: string): number {
  const red = parseInt(hex.slice(1, 3), 16);
  const green = parseInt(hex.slice(3, 5), 16);
  const blue = parseInt(hex.slice(5, 7), 16);
  return (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
}
