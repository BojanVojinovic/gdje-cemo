"use client";

import { ComboBox } from "@/components/combo-box";
import { CalendarSkeleton, InfoListSkeleton } from "@/components/skeletons";
import { Button, Field, inputClass, useToast } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { contentStatusLabel, contentTypeLabel, when, type VenueContentItem } from "@/lib/hospitality";
import type { Venue } from "@/types";
import { useEffect, useMemo, useState } from "react";

const types = ["event", "post", "announcement", "promotion", "special_offer"] as const;

export default function ContentPage() {
  const { token } = useAuth();
  const toast = useToast();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [items, setItems] = useState<VenueContentItem[]>([]);
  const [calendar, setCalendar] = useState<VenueContentItem[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [form, setForm] = useState({
    venue_id: "",
    type: "event",
    title: "",
    body: "",
    status: "draft",
    scheduled_at: "",
    expires_at: "",
    event_start_at: "",
    event_end_at: "",
    event_category: "",
    price: "",
    capacity: "",
    registration_mode: "none",
    valid_from: "",
    valid_until: "",
    daily_start: "",
    daily_end: "",
    terms: "",
    priority: "0",
  });

  async function load() {
    if (!token) return;
    const query = filter === "all" ? "" : `?status=${filter}`;
    const [list, owned, monthItems] = await Promise.all([
      api<VenueContentItem[]>(`/business/content${query}`, { token }),
      api<Venue[]>("/business/venues", { token }),
      api<VenueContentItem[]>(`/business/content-calendar?month=${month}`, { token }),
    ]);
    setItems(list.data);
    setVenues(owned.data);
    setCalendar(monthItems.data);
    setForm((current) => ({ ...current, venue_id: current.venue_id || String(owned.data[0]?.id ?? "") }));
    setLoading(false);
  }

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    void load().catch(() => setLoading(false));
  }, [token, filter, month]); // eslint-disable-line react-hooks/exhaustive-deps

  const days = useMemo(() => calendarDays(month), [month]);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (!token) return;
    const body: Record<string, unknown> = {
      venue_id: Number(form.venue_id),
      type: form.type,
      title: form.title,
      body: form.body,
      status: form.scheduled_at && form.status === "scheduled" ? "scheduled" : form.status,
      priority: Number(form.priority),
    };
    ["scheduled_at", "expires_at", "event_start_at", "event_end_at", "valid_from", "valid_until"].forEach((key) => {
      const value = form[key as keyof typeof form];
      if (value) body[key] = value;
    });
    if (form.event_category) body.event_category = form.event_category;
    if (form.price !== "") body.price = Number(form.price);
    if (form.capacity) body.capacity = Number(form.capacity);
    body.registration_mode = form.registration_mode;
    if (form.daily_start) body.daily_start = form.daily_start;
    if (form.daily_end) body.daily_end = form.daily_end;
    if (form.terms) body.terms = form.terms;
    if (form.type === "promotion" || form.type === "special_offer") body.days_of_week = [1, 2, 3, 4, 5];
    try {
      await api("/business/content", { method: "POST", token, body });
      toast("Sadržaj je sačuvan.");
      setForm({ ...form, title: "", body: "" });
      await load();
    } catch (reason) {
      toast(reason instanceof ApiError ? reason.message : "Sadržaj nije sačuvan.");
    }
  }

  async function act(id: number, action: "publish" | "duplicate" | "delete" | "archive" | "cancel") {
    if (!token) return;
    if (action === "publish") await api(`/business/content/${id}/publish`, { method: "POST", token });
    if (action === "duplicate") await api(`/business/content/${id}/duplicate`, { method: "POST", token });
    if (action === "delete") await api(`/business/content/${id}`, { method: "DELETE", token });
    if (action === "archive" || action === "cancel") await api(`/business/content/${id}`, { method: "PUT", token, body: { title: items.find((item) => item.id === id)?.title, type: items.find((item) => item.id === id)?.type, status: action === "archive" ? "archived" : "cancelled" } });
    toast("Sadržaj je ažuriran.");
    await load();
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="font-serif text-4xl">Sadržaj</h1>
        <div className="flex gap-2">
          {Array.from({ length: 5 }, (_, index) => <div key={index} className="h-11 w-24 animate-pulse rounded-full bg-line" />)}
        </div>
        <CalendarSkeleton />
        <InfoListSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-4xl">Sadržaj</h1>
      <div className="flex gap-2 overflow-x-auto">
        {["all", "draft", "scheduled", "published", "completed"].map((status) => (
          <button key={status} type="button" onClick={() => setFilter(status)} className={`min-h-11 rounded-full px-4 text-sm ${filter === status ? "bg-sea text-snow" : "bg-paper"}`}>
            {{ all: "Sve", draft: "Nacrti", scheduled: "Zakazano", published: "Objavljeno", completed: "Isteklo" }[status]}
          </button>
        ))}
      </div>
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-serif text-2xl">Kalendar</h2>
          <input aria-label="Mjesec" type="month" className={inputClass + " max-w-48"} value={month} onChange={(event) => setMonth(event.target.value)} />
        </div>
        <div className="grid grid-cols-7 gap-1 text-xs">
          {["Pon", "Uto", "Sri", "Čet", "Pet", "Sub", "Ned"].map((label) => <div key={label} className="px-1 text-muted">{label}</div>)}
          {days.map((day) => (
            <button key={day.key} type="button" className="min-h-16 rounded-xl border border-line bg-paper p-1 text-left" onClick={() => setForm({ ...form, scheduled_at: `${day.iso}T18:00`, status: "scheduled" })}>
              <span>{day.date.getDate()}</span>
              {calendar.filter((item) => sameDay(item, day.iso)).slice(0, 2).map((item) => (
                <span key={item.id} className="mt-1 block truncate">{item.title}</span>
              ))}
            </button>
          ))}
        </div>
      </section>
      <form onSubmit={create} className="grid gap-3 rounded-lg border border-line p-4 md:grid-cols-2">
        <h2 className="font-serif text-2xl md:col-span-2">Nova stavka</h2>
        <Field label="Mjesto">
          <ComboBox value={form.venue_id} onChange={(value) => setForm({ ...form, venue_id: value })} options={venues.map((venue) => ({ value: String(venue.id), label: venue.name }))} />
        </Field>
        <Field label="Vrsta">
          <ComboBox value={form.type} onChange={(value) => setForm({ ...form, type: value })} options={types.map((type) => ({ value: type, label: contentTypeLabel[type] }))} />
        </Field>
        <Field label="Naslov"><input required className={inputClass} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></Field>
        <Field label="Objava">
          <ComboBox value={form.status} onChange={(value) => setForm({ ...form, status: value })} options={[
            { value: "draft", label: "Nacrt" },
            { value: "published", label: "Odmah" },
            { value: "scheduled", label: "Zakaži" },
          ]} />
        </Field>
        <Field label="Tekst" ><textarea className={inputClass + " min-h-24 py-2 md:col-span-2"} value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} /></Field>
        {form.status === "scheduled" ? <Field label="Zakazano"><input type="datetime-local" className={inputClass} value={form.scheduled_at} onChange={(event) => setForm({ ...form, scheduled_at: event.target.value })} /></Field> : null}
        <Field label="Ističe"><input type="datetime-local" className={inputClass} value={form.expires_at} onChange={(event) => setForm({ ...form, expires_at: event.target.value })} /></Field>
        {form.type === "event" ? (
          <>
            <Field label="Početak"><input type="datetime-local" className={inputClass} value={form.event_start_at} onChange={(event) => setForm({ ...form, event_start_at: event.target.value })} /></Field>
            <Field label="Kraj"><input type="datetime-local" className={inputClass} value={form.event_end_at} onChange={(event) => setForm({ ...form, event_end_at: event.target.value })} /></Field>
            <Field label="Kategorija"><input className={inputClass} value={form.event_category} onChange={(event) => setForm({ ...form, event_category: event.target.value })} /></Field>
            <Field label="Cijena"><input type="number" min={0} className={inputClass} value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} /></Field>
            <Field label="Kapacitet"><input type="number" min={1} className={inputClass} value={form.capacity} onChange={(event) => setForm({ ...form, capacity: event.target.value })} /></Field>
            <Field label="Prijava">
              <ComboBox value={form.registration_mode} onChange={(value) => setForm({ ...form, registration_mode: value })} options={[
                { value: "none", label: "Bez prijave" },
                { value: "registration", label: "Prijava" },
                { value: "table_reservation", label: "Rezervacija stola" },
                { value: "capacity", label: "Po kapacitetu" },
              ]} />
            </Field>
          </>
        ) : null}
        {form.type === "promotion" || form.type === "special_offer" ? (
          <>
            <Field label="Važi od"><input type="datetime-local" className={inputClass} value={form.valid_from} onChange={(event) => setForm({ ...form, valid_from: event.target.value })} /></Field>
            <Field label="Važi do"><input type="datetime-local" className={inputClass} value={form.valid_until} onChange={(event) => setForm({ ...form, valid_until: event.target.value })} /></Field>
            <Field label="Od sata"><input type="time" className={inputClass} value={form.daily_start} onChange={(event) => setForm({ ...form, daily_start: event.target.value })} /></Field>
            <Field label="Do sata"><input type="time" className={inputClass} value={form.daily_end} onChange={(event) => setForm({ ...form, daily_end: event.target.value })} /></Field>
            <Field label="Uslovi"><input className={inputClass} value={form.terms} onChange={(event) => setForm({ ...form, terms: event.target.value })} /></Field>
          </>
        ) : null}
        {form.type === "announcement" ? <Field label="Prioritet"><input type="number" min={0} max={5} className={inputClass} value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })} /></Field> : null}
        <Button type="submit">Sačuvaj</Button>
      </form>
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.id} className="rounded-lg border border-line bg-paper p-4">
            <p className="text-xs text-muted">{contentTypeLabel[item.type]} · {contentStatusLabel[item.status] ?? item.status} · {item.venue?.name}</p>
            <h3 className="font-serif text-2xl">{item.title}</h3>
            <p className="text-sm text-muted">{when(item.event_start_at || item.scheduled_at || item.published_at)}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button onClick={() => void act(item.id, "publish")}>Objavi</Button>
              <Button variant="secondary" onClick={() => void act(item.id, "duplicate")}>Dupliraj</Button>
              <Button variant="secondary" onClick={() => void act(item.id, "archive")}>Arhiviraj</Button>
              <Button variant="ghost" onClick={() => void act(item.id, "cancel")}>Otkaži</Button>
              <Button variant="danger" onClick={() => void act(item.id, "delete")}>Obriši</Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function calendarDays(month: string) {
  const [year, monthIndex] = month.split("-").map(Number);
  const start = new Date(year, monthIndex - 1, 1);
  const end = new Date(year, monthIndex, 0);
  const lead = (start.getDay() + 6) % 7;
  const days: { key: string; date: Date; iso: string }[] = [];
  for (let index = 0; index < lead; index += 1) {
    const date = new Date(start);
    date.setDate(date.getDate() - (lead - index));
    days.push({ key: `p-${index}`, date, iso: date.toISOString().slice(0, 10) });
  }
  for (let day = 1; day <= end.getDate(); day += 1) {
    const date = new Date(year, monthIndex - 1, day);
    const iso = `${year}-${String(monthIndex).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    days.push({ key: iso, date, iso });
  }
  return days;
}

function sameDay(item: VenueContentItem, iso: string) {
  const value = item.event_start_at || item.scheduled_at || item.published_at || item.valid_from;
  return Boolean(value && value.slice(0, 10) === iso);
}
