"use client";

import { VenueForm } from "@/components/venue-form";
import { Button, Field, Skeleton, inputClass, useToast } from "@/components/ui";
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
  const [detail, setDetail] = useState<Detail | null>(null);
  const [tab, setTab] = useState<"info" | "photos" | "hours" | "menu" | "reviews">("info");
  const [reviews, setReviews] = useState<Review[]>([]);

  async function load() {
    if (!token) return;
    const response = await api<Detail>(`/business/venues/${params.id}`, { token });
    setDetail(response.data);
  }

  useEffect(() => { void load().catch(() => undefined); }, [token, params.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!detail) return <Skeleton className="h-64" />;
  const venue = detail.venue;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-4xl">{venue.name}</h1>
          <p className="text-sm text-muted">{detail.stats.profile_views} pregleda · {detail.stats.menu_views} menija · {detail.stats.favorites_count} sačuvanih · ocjena {detail.stats.rating_avg}</p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link href={`/business/venues/${venue.id}/floor-plan`} className="text-sea">Tlocrt</Link>
          <Link href={`/business/venues/${venue.id}/tables`} className="text-sea">Stolovi</Link>
          <Link href={`/venue/${venue.slug}`} className="text-sea">Javni profil</Link>
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto">
        {(["info", "photos", "hours", "menu", "reviews"] as const).map((item) => (
          <button key={item} type="button" onClick={() => setTab(item)} className={`min-h-11 rounded-full px-4 text-sm ${tab === item ? "bg-sea text-snow" : "bg-paper"}`}>
            {{ info: "Podaci", photos: "Fotografije", hours: "Radno vrijeme", menu: "Meni", reviews: "Recenzije" }[item]}
          </button>
        ))}
      </div>
      {tab === "info" ? <VenueForm venue={venue} /> : null}
      {tab === "photos" ? <Photos venue={venue} onChange={load} /> : null}
      {tab === "hours" ? <Hours venue={venue} onChange={load} /> : null}
      {tab === "menu" ? <MenuEditor venue={venue} onChange={load} /> : null}
      {tab === "reviews" ? <Reviews venueId={venue.id} reviews={reviews} setReviews={setReviews} /> : null}
      <Button
        variant="danger"
        onClick={async () => {
          if (!token || !window.confirm("Obrisati ovo mjesto? Ova radnja se ne može poništiti.")) return;
          await api(`/business/venues/${venue.id}`, { method: "DELETE", token });
          router.push("/business/venues");
        }}
      >
        Obriši mjesto
      </Button>
    </div>
  );
}

function Photos({ venue, onChange }: { venue: Venue; onChange: () => Promise<void> }) {
  const { token } = useAuth();
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
      <label className="block text-sm">Naslovna
        <input type="file" accept="image/jpeg,image/png,image/webp" className="mt-2 block" onChange={(event) => { if (event.target.files) void upload(`/business/venues/${venue.id}/cover`, event.target.files, "image"); }} />
      </label>
      {venue.cover_url ? <img src={venue.cover_url} alt="" className="h-40 w-full rounded-2xl object-cover" /> : null}
      <label className="block text-sm">Galerija
        <input type="file" multiple accept="image/jpeg,image/png,image/webp" className="mt-2 block" onChange={(event) => { if (event.target.files) void upload(`/business/venues/${venue.id}/images`, event.target.files, "images"); }} />
      </label>
      <div className="grid grid-cols-3 gap-2">
        {venue.images?.map((image, index) => (
          <div key={image.id} className="overflow-hidden rounded-2xl">
            {image.thumb_url ? <img src={image.thumb_url} alt={image.alt ?? ""} className="h-24 w-full object-cover" /> : null}
            <div className="flex justify-between px-2 py-1 text-xs">
              <button type="button" onClick={() => move(image.id, -1)} disabled={index === 0}>Lijevo</button>
              <button type="button" onClick={() => move(image.id, 1)} disabled={index === (venue.images?.length ?? 1) - 1}>Desno</button>
              <button type="button" className="text-coral" onClick={() => remove(image.id)}>Obriši</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Hours({ venue, onChange }: { venue: Venue; onChange: () => Promise<void> }) {
  const { token } = useAuth();
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
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={day.closed} onChange={() => setDays((current) => current.map((item) => item.day === day.day ? { ...item, closed: !item.closed, intervals: item.intervals.length ? item.intervals : [{ opens_at: "09:00", closes_at: "17:00" }] } : item))} /> {day.label} zatvoreno</label>
          <div className="flex flex-wrap gap-2">
            {(day.intervals.length ? day.intervals : [{ opens_at: "09:00", closes_at: "17:00" }]).map((interval, index) => (
              <span key={index} className="flex gap-1">
                <input className={inputClass + " w-28"} value={interval.opens_at} onChange={(event) => setIntervalValue(day.day, index, "opens_at", event.target.value)} disabled={day.closed} />
                <input className={inputClass + " w-28"} value={interval.closes_at} onChange={(event) => setIntervalValue(day.day, index, "closes_at", event.target.value)} disabled={day.closed} />
              </span>
            ))}
          </div>
          <button type="button" className="text-sm text-sea" onClick={() => setDays((current) => current.map((item) => item.day === day.day ? { ...item, closed: false, intervals: [...(item.intervals.length ? item.intervals : [{ opens_at: "09:00", closes_at: "17:00" }]), { opens_at: "17:00", closes_at: "23:00" }] } : item))}>+ interval</button>
        </div>
      ))}
      <Button onClick={save}>Sačuvaj radno vrijeme</Button>
    </div>
  );
}

function MenuEditor({ venue, onChange }: { venue: Venue; onChange: () => Promise<void> }) {
  const { token } = useAuth();
  const toast = useToast();
  const [name, setName] = useState("");
  const categories = venue.menu?.categories ?? [];

  async function addCategory(event: React.FormEvent) {
    event.preventDefault();
    if (!token) return;
    await api(`/business/venues/${venue.id}/menu/categories`, { method: "POST", token, body: { name } });
    setName("");
    await onChange();
  }

  async function addItem(category: MenuCategory, itemName: string, price: string) {
    if (!token) return;
    try {
      await api(`/business/menu/categories/${category.id}/items`, { method: "POST", token, body: { name: itemName, price: Number(price), is_available: true } });
      await onChange();
    } catch (error) {
      toast(error instanceof ApiError ? error.message : "Stavka nije dodata.");
    }
  }

  async function toggle(itemId: number, isAvailable: boolean, itemName: string, price: number) {
    if (!token) return;
    await api(`/business/menu/items/${itemId}`, { method: "PUT", token, body: { name: itemName, price, is_available: !isAvailable } });
    await onChange();
  }

  async function removeItem(id: number) {
    if (!token || !window.confirm("Obrisati stavku?")) return;
    await api(`/business/menu/items/${id}`, { method: "DELETE", token });
    await onChange();
  }

  async function removeCategory(id: number) {
    if (!token || !window.confirm("Obrisati kategoriju i sve stavke?")) return;
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

  return (
    <div className="space-y-4">
      <form onSubmit={addCategory} className="flex gap-2">
        <input className={inputClass} value={name} onChange={(event) => setName(event.target.value)} placeholder="Nova kategorija menija" required />
        <Button type="submit">Dodaj</Button>
      </form>
      {categories.length === 0 ? <p className="text-sm text-muted">Nema stavki menija.</p> : null}
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
}: {
  category: MenuCategory;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (direction: -1 | 1) => Promise<void>;
  onAdd: (category: MenuCategory, name: string, price: string) => Promise<void>;
  onToggle: (id: number, available: boolean, name: string, price: number) => Promise<void>;
  onRemoveItem: (id: number) => Promise<void>;
  onRemoveCategory: (id: number) => Promise<void>;
  onMoveItem: (id: number, direction: -1 | 1) => Promise<void>;
  onImage: (id: number, file: File) => Promise<void>;
}) {
  const [itemName, setItemName] = useState("");
  const [price, setPrice] = useState("");

  return (
    <section className="rounded-lg border border-line bg-paper p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">{category.name}</h2>
        <span className="flex gap-3 text-sm">
          <button type="button" disabled={!canMoveUp} onClick={() => onMove(-1)}>Gore</button>
          <button type="button" disabled={!canMoveDown} onClick={() => onMove(1)}>Dolje</button>
          <button type="button" className="text-coral" onClick={() => onRemoveCategory(category.id)}>Obriši</button>
        </span>
      </div>
      <ul className="mt-2 divide-y divide-line">
        {category.items?.map((item, index) => (
          <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-2 text-sm">
            <span className={item.is_available ? "" : "text-muted"}>{item.name} · {formatPrice(Number(item.price))}</span>
            <span className="flex flex-wrap items-center gap-3">
              <button type="button" disabled={index === 0} onClick={() => onMoveItem(item.id, -1)}>Gore</button>
              <button type="button" disabled={index === (category.items?.length ?? 1) - 1} onClick={() => onMoveItem(item.id, 1)}>Dolje</button>
              <button type="button" onClick={() => onToggle(item.id, item.is_available, item.name, Number(item.price))}>{item.is_available ? "Sakrij" : "Vrati"}</button>
              <label className="cursor-pointer">
                Foto
                <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void onImage(item.id, file); }} />
              </label>
              <button type="button" onClick={() => onRemoveItem(item.id)}>Obriši</button>
            </span>
          </li>
        ))}
      </ul>
      <form className="mt-3 flex flex-wrap gap-2" onSubmit={(event) => { event.preventDefault(); void onAdd(category, itemName, price).then(() => { setItemName(""); setPrice(""); }); }}>
        <input className={inputClass + " max-w-xs"} value={itemName} onChange={(event) => setItemName(event.target.value)} placeholder="Stavka" required />
        <input className={inputClass + " max-w-32"} value={price} onChange={(event) => setPrice(event.target.value)} placeholder="Cijena" required />
        <Button type="submit" variant="secondary">Dodaj stavku</Button>
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
