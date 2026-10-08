"use client";

import { useI18n } from "@/components/i18n-provider";
import { CopyEditor, type CopyBag } from "@/components/locale-tabs";
import { BrandPanel } from "@/components/brand-panel";
import { VenueForm } from "@/components/venue-form";
import { FieldSkeleton, StatGridSkeleton } from "@/components/skeletons";
import { Button, Field, inputClass, useToast } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate, formatPrice } from "@/lib/format";
import type { MenuCategory, OpeningDay, Review, Venue } from "@/types";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Detail = { venue: Venue; stats: { profile_views: number; menu_views: number; reviews_count: number; rating_avg: number; favorites_count: number } };

export default function ManageVenuePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuth();
  const { t } = useI18n();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [tab, setTab] = useState<"info" | "photos" | "hours" | "menu" | "reviews" | "staff" | "look">("info");
  const [reviews, setReviews] = useState<Review[]>([]);

  async function load() {
    if (!token) return;
    const response = await api<Detail>(`/business/venues/${params.id}`, { token });
    setDetail(response.data);
  }

  useEffect(() => { void load().catch(() => undefined); }, [token, params.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!detail) {
    return (
      <div className="space-y-5" aria-busy="true">
        <span className="sr-only">Učitavanje</span>
        <div className="h-10 w-72 animate-pulse rounded bg-line" />
        <StatGridSkeleton count={5} className="grid gap-3 sm:grid-cols-3" />
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 8 }, (_, index) => <FieldSkeleton key={index} />)}
        </div>
      </div>
    );
  }
  const venue = detail.venue;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-4xl">{venue.name}</h1>
          <p className="text-sm text-muted">{t("venue.stats", { views: detail.stats.profile_views, menu: detail.stats.menu_views, saved: detail.stats.favorites_count, rating: detail.stats.rating_avg })}</p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link href={`/business/venues/${venue.id}/floor-plan`} className="text-sea">{t("venue.floor")}</Link>
          <Link href={`/business/venues/${venue.id}/tables`} className="text-sea">{t("venue.tables")}</Link>
          <Link href={`/venue/${venue.slug}`} className="text-sea">{t("brand.title")}</Link>
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto">
        {(["info", "look", "photos", "hours", "menu", "staff", "reviews"] as const).map((item) => (
          <button key={item} type="button" onClick={() => setTab(item)} className={`min-h-11 rounded-full px-4 text-sm ${tab === item ? "bg-sea text-snow" : "bg-paper"}`}>
            {{ info: t("venue.details"), look: t("brand.tab"), photos: t("photo.gallery"), hours: t("venue.hours"), menu: t("nav.menu"), staff: t("nav.staff"), reviews: t("profile.reviews") }[item]}
          </button>
        ))}
      </div>
      {tab === "info" ? <VenueForm venue={venue} /> : null}
      {tab === "look" ? <BrandPanel venue={venue} onChange={load} /> : null}
      {tab === "photos" ? <Photos venue={venue} onChange={load} /> : null}
      {tab === "hours" ? <Hours venue={venue} onChange={load} /> : null}
      {tab === "menu" ? <MenuEditor venue={venue} onChange={load} /> : null}
      {tab === "staff" ? <StaffPanel venueId={venue.id} /> : null}
      {tab === "reviews" ? <Reviews venueId={venue.id} reviews={reviews} setReviews={setReviews} /> : null}
      <Button
        variant="danger"
        onClick={async () => {
          if (!token || !window.confirm("Obrisati ovo mjesto? Ova radnja se ne može poništiti.")) return;
          await api(`/business/venues/${venue.id}`, { method: "DELETE", token });
          router.push("/business/venues");
        }}
      >
        {t("action.delete")}
      </Button>
    </div>
  );
}

function Photos({ venue, onChange }: { venue: Venue; onChange: () => Promise<void> }) {
  const { token } = useAuth();
  const { t } = useI18n();
  const toast = useToast();

  async function upload(path: string, files: FileList, field: string) {
    if (!token) return;
    const data = new FormData();
    if (field === "image") data.append("image", files[0]);
    else Array.from(files).forEach((file) => data.append("images[]", file));
    try {
      await api(path, { method: "POST", token, formData: data });
      toast("Fotografija je sačuvana.");
      await onChange();
    } catch (error) {
      toast(error instanceof ApiError ? error.message : "Otpremanje nije uspjelo.");
    }
  }

  async function remove(id: number) {
    if (!token || !window.confirm("Obrisati fotografiju?")) return;
    await api(`/business/venues/${venue.id}/images/${id}`, { method: "DELETE", token });
    await onChange();
  }

  async function move(id: number, direction: -1 | 1) {
    if (!token || !venue.images) return;
    const ids = venue.images.map((image) => image.id);
    const index = ids.indexOf(id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= ids.length) return;
    const next = [...ids];
    [next[index], next[target]] = [next[target], next[index]];
    await api(`/business/venues/${venue.id}/images/reorder`, { method: "PUT", token, body: { ids: next } });
    await onChange();
  }

  return (
    <div className="space-y-4 rounded-lg border border-line bg-paper p-5">
      <label className="block text-sm">{t("photo.cover")}
        <input type="file" accept="image/jpeg,image/png,image/webp" className="mt-2 block" onChange={(event) => { if (event.target.files) void upload(`/business/venues/${venue.id}/cover`, event.target.files, "image"); }} />
      </label>
      {venue.cover_url ? <img src={venue.cover_url} alt="" className="h-40 w-full rounded-2xl object-cover" /> : null}
      <label className="block text-sm">{t("photo.gallery")}
        <input type="file" multiple accept="image/jpeg,image/png,image/webp" className="mt-2 block" onChange={(event) => { if (event.target.files) void upload(`/business/venues/${venue.id}/images`, event.target.files, "images"); }} />
      </label>
      <div className="grid grid-cols-3 gap-2">
        {venue.images?.map((image, index) => (
          <div key={image.id} className="overflow-hidden rounded-2xl">
            {image.thumb_url ? <img src={image.thumb_url} alt={image.alt ?? ""} className="h-24 w-full object-cover" /> : null}
            <div className="flex justify-between px-2 py-1 text-xs">
              <button type="button" onClick={() => move(image.id, -1)} disabled={index === 0}>{t("gallery.left")}</button>
              <button type="button" onClick={() => move(image.id, 1)} disabled={index === (venue.images?.length ?? 1) - 1}>{t("gallery.right")}</button>
              <button type="button" className="text-coral" onClick={() => remove(image.id)}>{t("action.delete")}</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Hours({ venue, onChange }: { venue: Venue; onChange: () => Promise<void> }) {
  const { token } = useAuth();
  const { t } = useI18n();
  const toast = useToast();
  const [days, setDays] = useState<OpeningDay[]>(venue.opening_hours ?? []);

  useEffect(() => setDays(venue.opening_hours ?? []), [venue]);

  function setIntervalValue(day: number, index: number, key: "opens_at" | "closes_at", value: string) {
    setDays((current) => current.map((item) => {
      if (item.day !== day) return item;
      const intervals = item.intervals.length ? item.intervals.map((interval) => ({ ...interval })) : [{ opens_at: "09:00", closes_at: "17:00" }];
      intervals[index] = { ...intervals[index], [key]: value };
      return { ...item, closed: false, intervals };
    }));
  }

  async function save() {
    if (!token) return;
    const intervals = days.flatMap((day) => day.closed ? [] : day.intervals.filter((interval) => interval.opens_at && interval.closes_at).map((interval) => ({
      day_of_week: day.day,
      opens_at: interval.opens_at,
      closes_at: interval.closes_at,
    })));
    try {
      await api(`/business/venues/${venue.id}/hours`, { method: "PUT", token, body: { intervals } });
      toast("Radno vrijeme je sačuvano.");
      await onChange();
    } catch (error) {
      toast(error instanceof ApiError ? error.message : "Čuvanje nije uspjelo.");
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-line bg-paper p-5">
      {days.map((day) => (
        <div key={day.day} className="grid items-center gap-2 sm:grid-cols-[140px_1fr_auto]">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={day.closed} onChange={() => setDays((current) => current.map((item) => item.day === day.day ? { ...item, closed: !item.closed, intervals: item.intervals.length ? item.intervals : [{ opens_at: "09:00", closes_at: "17:00" }] } : item))} /> {t(`day.${day.day}`)} {t("hours.closed")}</label>
          <div className="flex flex-wrap gap-2">
            {(day.intervals.length ? day.intervals : [{ opens_at: "09:00", closes_at: "17:00" }]).map((interval, index) => (
              <span key={index} className="flex gap-1">
                <input className={inputClass + " w-28"} value={interval.opens_at} onChange={(event) => setIntervalValue(day.day, index, "opens_at", event.target.value)} disabled={day.closed} />
                <input className={inputClass + " w-28"} value={interval.closes_at} onChange={(event) => setIntervalValue(day.day, index, "closes_at", event.target.value)} disabled={day.closed} />
              </span>
            ))}
          </div>
          <button type="button" className="text-sm text-sea" onClick={() => setDays((current) => current.map((item) => item.day === day.day ? { ...item, closed: false, intervals: [...(item.intervals.length ? item.intervals : [{ opens_at: "09:00", closes_at: "17:00" }]), { opens_at: "17:00", closes_at: "23:00" }] } : item))}>{t("hours.interval")}</button>
        </div>
      ))}
      <Button onClick={save}>{t("hours.save")}</Button>
    </div>
  );
}

function MenuEditor({ venue, onChange }: { venue: Venue; onChange: () => Promise<void> }) {
  const { token } = useAuth();
  const { t } = useI18n();
  const toast = useToast();
  const [name, setName] = useState("");
  const [copy, setCopy] = useState<CopyBag>({});
  const [station, setStation] = useState<"kitchen" | "bar">("kitchen");
  const categories = venue.menu?.categories ?? [];

  async function addCategory(event: React.FormEvent) {
    event.preventDefault();
    if (!token) return;
    await api(`/business/venues/${venue.id}/menu/categories`, { method: "POST", token, body: { name, station, translations: copy } });
    setName("");
    setCopy({});
    setStation("kitchen");
    await onChange();
  }

  async function addItem(category: MenuCategory, itemName: string, price: string, description: string, translations: CopyBag) {
    if (!token) return;
    try {
      await api(`/business/menu/categories/${category.id}/items`, { method: "POST", token, body: { name: itemName, description: description || null, price: Number(price), is_available: true, translations } });
      await onChange();
    } catch (error) {
      toast(error instanceof ApiError ? error.message : "Stavka nije dodata.");
    }
  }

  async function toggle(itemId: number, isAvailable: boolean) {
    if (!token) return;
    await api(`/business/menu/items/${itemId}`, { method: "PUT", token, body: { is_available: !isAvailable } });
    await onChange();
  }

  async function removeItem(id: number) {
    if (!token || !window.confirm(t("menu.deleteItem"))) return;
    await api(`/business/menu/items/${id}`, { method: "DELETE", token });
    await onChange();
  }

  async function removeCategory(id: number) {
    if (!token || !window.confirm(t("menu.deleteCategory"))) return;
    await api(`/business/menu/categories/${id}`, { method: "DELETE", token });
    await onChange();
  }

  async function moveCategory(id: number, direction: -1 | 1) {
    if (!token) return;
    const ids = categories.map((category) => category.id);
    const index = ids.indexOf(id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= ids.length) return;
    const next = [...ids];
    [next[index], next[target]] = [next[target], next[index]];
    await api(`/business/venues/${venue.id}/menu/categories/reorder`, { method: "PUT", token, body: { ids: next } });
    await onChange();
  }

  async function moveItem(category: MenuCategory, id: number, direction: -1 | 1) {
    if (!token) return;
    const ids = (category.items ?? []).map((item) => item.id);
    const index = ids.indexOf(id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= ids.length) return;
    const next = [...ids];
    [next[index], next[target]] = [next[target], next[index]];
    await api(`/business/menu/categories/${category.id}/items/reorder`, { method: "PUT", token, body: { ids: next } });
    await onChange();
  }

  async function uploadItemImage(itemId: number, file: File) {
    if (!token) return;
    const data = new FormData();
    data.append("image", file);
    try {
      await api(`/business/menu/items/${itemId}/image`, { method: "POST", token, formData: data });
      await onChange();
    } catch (error) {
      toast(error instanceof ApiError ? error.message : "Fotografija stavke nije sačuvana.");
    }
  }

  async function setCategoryStation(category: MenuCategory, next: "kitchen" | "bar") {
    if (!token) return;
    await api(`/business/menu/categories/${category.id}`, { method: "PUT", token, body: { name: category.source_name || category.name, station: next } });
    await onChange();
  }

  return (
    <div className="space-y-4">
      <form onSubmit={addCategory} className="space-y-3">
        <CopyEditor fields={[{ id: "name", label: t("field.menuCategory") }]} source={{ name }} setSource={(_id, value) => setName(value)} bag={copy} setBag={setCopy} />
        <div className="flex flex-wrap gap-2">
          <select className={inputClass + " max-w-40"} value={station} onChange={(event) => setStation(event.target.value as "kitchen" | "bar")} aria-label={t("field.kitchen")}>
            <option value="kitchen">{t("field.kitchen")}</option>
            <option value="bar">{t("field.bar")}</option>
          </select>
          <Button type="submit">{t("action.add")}</Button>
        </div>
      </form>
      {categories.length === 0 ? <p className="text-sm text-muted">{t("menu.empty")}</p> : null}
      {categories.map((category, index) => (
        <CategoryBlock
          key={category.id}
          category={category}
          canMoveUp={index > 0}
          canMoveDown={index < categories.length - 1}
          onMove={(direction) => moveCategory(category.id, direction)}
          onAdd={addItem}
          onToggle={toggle}
          onRemoveItem={removeItem}
          onRemoveCategory={removeCategory}
          onMoveItem={(id, direction) => moveItem(category, id, direction)}
          onImage={uploadItemImage}
          onStation={(next) => setCategoryStation(category, next)}
        />
      ))}
    </div>
  );
}

function CategoryBlock({
  category,
  canMoveUp,
  canMoveDown,
  onMove,
  onAdd,
  onToggle,
  onRemoveItem,
  onRemoveCategory,
  onMoveItem,
  onImage,
  onStation,
}: {
  category: MenuCategory;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (direction: -1 | 1) => Promise<void>;
  onAdd: (category: MenuCategory, name: string, price: string, description: string, translations: CopyBag) => Promise<void>;
  onToggle: (id: number, available: boolean) => Promise<void>;
  onRemoveItem: (id: number) => Promise<void>;
  onRemoveCategory: (id: number) => Promise<void>;
  onMoveItem: (id: number, direction: -1 | 1) => Promise<void>;
  onImage: (id: number, file: File) => Promise<void>;
  onStation: (station: "kitchen" | "bar") => Promise<void>;
}) {
  const { t } = useI18n();
  const [itemName, setItemName] = useState("");
  const [description, setDescription] = useState("");
  const [copy, setCopy] = useState<CopyBag>({});
  const [price, setPrice] = useState("");

  return (
    <section className="rounded-lg border border-line bg-paper p-4">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-3">
          <h2 className="font-medium">{category.name}</h2>
          <select className={inputClass + " w-32 py-1"} value={category.station ?? "kitchen"} onChange={(event) => void onStation(event.target.value as "kitchen" | "bar")}>
            <option value="kitchen">{t("field.kitchen")}</option>
            <option value="bar">{t("field.bar")}</option>
          </select>
        </span>
        <span className="flex gap-3 text-sm">
          <button type="button" disabled={!canMoveUp} onClick={() => onMove(-1)}>{t("action.up")}</button>
          <button type="button" disabled={!canMoveDown} onClick={() => onMove(1)}>{t("action.down")}</button>
          <button type="button" className="text-coral" onClick={() => onRemoveCategory(category.id)}>{t("action.delete")}</button>
        </span>
      </div>
      <ul className="mt-2 divide-y divide-line">
        {category.items?.map((item, index) => (
          <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-2 text-sm">
            <span className={item.is_available ? "" : "text-muted"}>{item.name} · {formatPrice(Number(item.price))}</span>
            <span className="flex flex-wrap items-center gap-3">
              <button type="button" disabled={index === 0} onClick={() => onMoveItem(item.id, -1)}>{t("action.up")}</button>
              <button type="button" disabled={index === (category.items?.length ?? 1) - 1} onClick={() => onMoveItem(item.id, 1)}>{t("action.down")}</button>
              <button type="button" onClick={() => onToggle(item.id, item.is_available)}>{item.is_available ? t("action.hide") : t("action.restore")}</button>
              <label className="cursor-pointer">
                {t("action.photo")}
                <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void onImage(item.id, file); }} />
              </label>
              <button type="button" onClick={() => onRemoveItem(item.id)}>{t("action.delete")}</button>
            </span>
          </li>
        ))}
      </ul>
      <form className="mt-3 space-y-3" onSubmit={(event) => { event.preventDefault(); void onAdd(category, itemName, price, description, copy).then(() => { setItemName(""); setDescription(""); setCopy({}); setPrice(""); }); }}>
        <CopyEditor
          fields={[
            { id: "name", label: t("field.item") },
            { id: "description", label: t("field.itemDescription"), rows: 2, required: false },
          ]}
          source={{ name: itemName, description }}
          setSource={(id, value) => { if (id === "name") setItemName(value); else setDescription(value); }}
          bag={copy}
          setBag={setCopy}
        />
        <div className="flex flex-wrap gap-2">
          <input className={inputClass + " max-w-32"} value={price} onChange={(event) => setPrice(event.target.value)} placeholder={t("field.price")} aria-label={t("field.price")} required />
          <Button type="submit" variant="secondary">{t("menu.addItem")}</Button>
        </div>
      </form>
    </section>
  );
}

function Reviews({ venueId, reviews, setReviews }: { venueId: number; reviews: Review[]; setReviews: (reviews: Review[]) => void }) {
  const { token } = useAuth();
  const toast = useToast();
  const [drafts, setDrafts] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!token) return;
    api<Review[]>(`/business/venues/${venueId}/reviews`, { token }).then((response) => setReviews(response.data)).catch(() => undefined);
  }, [token, venueId, setReviews]);

  async function respond(review: Review) {
    if (!token) return;
    try {
      await api(`/reviews/${review.id}/response`, { method: "POST", token, body: { body: drafts[review.id] || review.response?.body || "" } });
      const list = await api<Review[]>(`/business/venues/${venueId}/reviews`, { token });
      setReviews(list.data);
      toast("Odgovor je sačuvan.");
    } catch (error) {
      toast(error instanceof ApiError ? error.message : "Odgovor nije sačuvan.");
    }
  }

  return (
    <ul className="space-y-3">
      {reviews.length === 0 ? <li className="text-sm text-muted">Nema recenzija.</li> : null}
      {reviews.map((review) => (
        <li key={review.id} className="rounded-lg border border-line bg-paper p-4 text-sm">
          <p className="font-medium">{review.user?.name} · {review.rating}/5 · {formatDate(review.created_at)}</p>
          <p className="mt-2">{review.body}</p>
          <Field label="Odgovor">
            <textarea className={inputClass + " mt-2 min-h-20 py-2"} defaultValue={review.response?.body ?? ""} onChange={(event) => setDrafts({ ...drafts, [review.id]: event.target.value })} />
          </Field>
          <Button className="mt-2" variant="secondary" onClick={() => respond(review)}>Odgovori</Button>
        </li>
      ))}
    </ul>
  );
}

const staffRoleIds = ["waiter", "bar", "kitchen", "delivery"] as const;

function StaffPanel({ venueId }: { venueId: number }) {
  const { token } = useAuth();
  const { t } = useI18n();
  const staffRoles = staffRoleIds.map((id) => ({ id, label: t(`staff.role.${id}`) }));
  const toast = useToast();
  const [rows, setRows] = useState<{ id: number; name: string; email: string; roles: string[] }[]>([]);
  const [email, setEmail] = useState("");
  const [roles, setRoles] = useState<string[]>(["waiter"]);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!token) return;
    setLoading(true);
    try {
      const response = await api<typeof rows>(`/business/venues/${venueId}/staff`, { token });
      setRows(response.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load().catch(() => undefined); }, [token, venueId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!token || roles.length === 0) return;
    try {
      await api(`/business/venues/${venueId}/staff`, { method: "POST", token, body: { email, roles } });
      setEmail("");
      toast("Osoblje je sačuvano.");
      await load();
    } catch (error) {
      const detail = error instanceof ApiError ? error.errors?.email?.[0] || error.message : "Osoblje nije sačuvano.";
      toast(detail);
    }
  }

  async function remove(id: number) {
    if (!token || !window.confirm("Ukloniti ovu osobu sa lokala?")) return;
    await api(`/business/venues/${venueId}/staff/${id}`, { method: "DELETE", token });
    toast("Osoblje je uklonjeno.");
    await load();
  }

  return (
    <div className="space-y-4">
      <form onSubmit={(event) => void save(event)} className="space-y-3 rounded-lg border border-line bg-paper p-4">
        <Field label={t("staff.email")}>
          <input className={inputClass} type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="ime@email.com" required />
        </Field>
        <div className="flex flex-wrap gap-4 text-sm">
          {staffRoles.map((role) => (
            <label key={role.id} className="flex min-h-11 items-center gap-2">
              <input
                type="checkbox"
                checked={roles.includes(role.id)}
                onChange={() => setRoles((current) => current.includes(role.id) ? current.filter((item) => item !== role.id) : [...current, role.id])}
              />
              {role.label}
            </label>
          ))}
        </div>
        <Button type="submit" disabled={roles.length === 0}>{t("staff.add")}</Button>
      </form>
      {loading ? <FieldSkeleton /> : null}
      {!loading ? (
        <ul className="space-y-2">
          {rows.length === 0 ? <li className="text-sm text-muted">Niko još nije dodijeljen ovom lokalu.</li> : null}
          {rows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-paper p-4 text-sm">
              <span>
                <span className="font-medium">{row.name}</span>
                <span className="mt-1 block text-muted">{row.email}</span>
                <span className="mt-1 block">{row.roles.map((role) => staffRoles.find((item) => item.id === role)?.label ?? role).join(", ")}</span>
              </span>
              <button type="button" className="text-coral" onClick={() => void remove(row.id)}>Ukloni</button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
