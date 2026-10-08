"use client";

import { ComboBox } from "@/components/combo-box";
import { useI18n } from "@/components/i18n-provider";
import { CopyEditor, type CopyBag } from "@/components/locale-tabs";
import { Button, Field, inputClass, useToast } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Amenity, Category, User, Venue } from "@/types";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const empty = {
  business_id: "",
  category_id: "",
  subcategory_id: "",
  name: "",
  description: "",
  address: "",
  city: "",
  country: "Crna Gora",
  latitude: "42.4410",
  longitude: "19.2630",
  phone: "",
  email: "",
  website: "",
  instagram: "",
  facebook: "",
  tiktok: "",
  price_level: "2",
  status: "draft",
  offers_delivery: false,
  delivery_eta_minutes: "45",
  amenity_ids: [] as number[],
  translations: {} as CopyBag,
};

export function VenueForm({ venue }: { venue?: Venue }) {
  const { token, user } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [profile, setProfile] = useState<User | null>(user);
  const [adminBusinesses, setAdminBusinesses] = useState<{ id: number; name: string; status: string }[]>([]);
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api<Category[]>("/categories").then((response) => setCategories(response.data)).catch(() => undefined);
    api<Amenity[]>("/amenities").then((response) => setAmenities(response.data)).catch(() => undefined);
    if (!token) return;
    api<User>("/me", { token }).then((response) => {
      setProfile(response.data);
      if (response.data.role === "admin") {
        api<{ id: number; name: string; status: string }[]>("/admin/businesses?per_page=50", { token })
          .then((list) => setAdminBusinesses(list.data))
          .catch(() => undefined);
      }
    }).catch(() => undefined);
  }, [token]);

  useEffect(() => {
    if (!venue) return;
    setForm({
      business_id: String(venue.business?.id ?? ""),
      category_id: String(venue.category?.id ?? ""),
      subcategory_id: String(venue.subcategory?.id ?? ""),
      name: venue.name,
      description: venue.source?.description ?? venue.description,
      address: venue.address,
      city: venue.city,
      country: venue.country,
      latitude: String(venue.latitude),
      longitude: String(venue.longitude),
      phone: venue.phone ?? "",
      email: venue.email ?? "",
      website: venue.website ?? "",
      instagram: venue.socials.instagram ?? "",
      facebook: venue.socials.facebook ?? "",
      tiktok: venue.socials.tiktok ?? "",
      price_level: String(venue.price_level),
      status: venue.status,
      offers_delivery: Boolean(venue.offers_delivery),
      delivery_eta_minutes: String(venue.delivery_eta_minutes ?? 45),
      amenity_ids: venue.amenities?.map((amenity) => amenity.id) ?? [],
      translations: (venue.translations ?? {}) as CopyBag,
    });
  }, [venue]);

  const businesses = profile?.role === "admin" && adminBusinesses.length
    ? adminBusinesses
    : (profile?.businesses ?? []).filter((business) => business.status === "approved" || profile?.role === "admin");
  const selected = categories.find((category) => String(category.id) === form.category_id);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!token) return;
    if (form.description.trim().length < 20) {
      toast("Opis treba biti malo duži, bar par rečenica.");
      return;
    }
    setLoading(true);
    const payload = {
      ...form,
      business_id: Number(form.business_id),
      category_id: Number(form.category_id),
      subcategory_id: form.subcategory_id ? Number(form.subcategory_id) : null,
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      price_level: Number(form.price_level),
      offers_delivery: form.offers_delivery,
      delivery_eta_minutes: form.offers_delivery ? Number(form.delivery_eta_minutes) : null,
      phone: form.phone || null,
      email: form.email || null,
      website: form.website || null,
      instagram: form.instagram || null,
      facebook: form.facebook || null,
      tiktok: form.tiktok || null,
      translations: form.translations,
    };
    try {
      if (venue) {
        await api(`/business/venues/${venue.id}`, { method: "PUT", token, body: payload });
        toast("Podaci su sačuvani.");
      } else {
        const response = await api<Venue>("/business/venues", { method: "POST", token, body: payload });
        toast("Mjesto je kreirano.");
        router.push(`/business/venues/${response.data.id}`);
      }
    } catch (reason) {
      toast(reason instanceof ApiError ? reason.message : "Čuvanje nije uspjelo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-lg border border-line bg-paper p-5 md:grid-cols-2">
      <Field label={t("field.business")}>
        <ComboBox value={form.business_id} onChange={(value) => setForm({ ...form, business_id: value })} options={[{ value: "", label: t("field.choose") }, ...businesses.map((business) => ({ value: String(business.id), label: business.name }))]} />
      </Field>
      <Field label={t("field.category")}>
        <ComboBox value={form.category_id} onChange={(value) => setForm({ ...form, category_id: value, subcategory_id: "" })} options={[{ value: "", label: t("field.choose") }, ...categories.map((category) => ({ value: String(category.id), label: category.label || category.name }))]} />
      </Field>
      <Field label={t("field.subcategory")}>
        <ComboBox value={form.subcategory_id} onChange={(value) => setForm({ ...form, subcategory_id: value })} options={[{ value: "", label: t("field.none") }, ...(selected?.children?.map((child) => ({ value: String(child.id), label: child.label || child.name })) ?? [])]} />
      </Field>
      <Field label={t("field.name")}><input className={inputClass} required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
      <CopyEditor
        fields={[{ id: "description", label: t("field.description"), rows: 5 }]}
        source={{ description: form.description }}
        setSource={(_id, value) => setForm({ ...form, description: value })}
        bag={form.translations}
        setBag={(translations) => setForm({ ...form, translations })}
      />
      <Field label={t("field.address")}><input className={inputClass} required value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></Field>
      <Field label={t("field.city")}><input className={inputClass} required value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} /></Field>
      <Field label={t("field.country")}><input className={inputClass} required value={form.country} onChange={(event) => setForm({ ...form, country: event.target.value })} /></Field>
      <Field label={t("field.price")}>
        <ComboBox value={form.price_level} onChange={(value) => setForm({ ...form, price_level: value })} options={[
          { value: "1", label: "€" },
          { value: "2", label: "€€" },
          { value: "3", label: "€€€" },
          { value: "4", label: "€€€€" },
        ]} />
      </Field>
      <Field label={t("field.latitude")}><input className={inputClass} required value={form.latitude} onChange={(event) => setForm({ ...form, latitude: event.target.value })} /></Field>
      <Field label={t("field.longitude")}><input className={inputClass} required value={form.longitude} onChange={(event) => setForm({ ...form, longitude: event.target.value })} /></Field>
      <Field label={t("field.phone")}><input className={inputClass} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></Field>
      <Field label={t("field.email")}><input className={inputClass} type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></Field>
      <Field label={t("field.website")}><input className={inputClass} value={form.website} onChange={(event) => setForm({ ...form, website: event.target.value })} placeholder="https://" /></Field>
      <Field label="Instagram"><input className={inputClass} value={form.instagram} onChange={(event) => setForm({ ...form, instagram: event.target.value })} /></Field>
      <Field label="Facebook"><input className={inputClass} value={form.facebook} onChange={(event) => setForm({ ...form, facebook: event.target.value })} /></Field>
      <Field label="TikTok"><input className={inputClass} value={form.tiktok} onChange={(event) => setForm({ ...form, tiktok: event.target.value })} /></Field>
      <Field label={t("field.status")}>
        <ComboBox value={form.status} onChange={(value) => setForm({ ...form, status: value })} options={[
          { value: "draft", label: t("field.draft") },
          { value: "published", label: t("field.published") },
        ]} />
      </Field>
      <label className="flex min-h-11 items-center gap-2 text-sm md:col-span-2">
        <input type="checkbox" checked={form.offers_delivery} onChange={(event) => setForm({ ...form, offers_delivery: event.target.checked })} />
        {t("form.delivery")}
      </label>
      {form.offers_delivery ? (
        <Field label={t("form.eta")}>
          <input className={inputClass} inputMode="numeric" min={5} max={180} required value={form.delivery_eta_minutes} onChange={(event) => setForm({ ...form, delivery_eta_minutes: event.target.value })} />
        </Field>
      ) : null}
      <fieldset className="md:col-span-2">
        <legend className="mb-2 text-sm font-medium">{t("field.amenities")}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {amenities.map((amenity) => (
            <label key={amenity.id} className="flex min-h-8 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.amenity_ids.includes(amenity.id)}
                onChange={() => setForm({
                  ...form,
                  amenity_ids: form.amenity_ids.includes(amenity.id)
                    ? form.amenity_ids.filter((id) => id !== amenity.id)
                    : [...form.amenity_ids, amenity.id],
                })}
              />
              {amenity.label || amenity.name}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="md:col-span-2"><Button type="submit" loading={loading}>{t("action.save")}</Button></div>
    </form>
  );
}
