"use client";

import { ComboBox } from "@/components/combo-box";
import { useI18n } from "@/components/i18n-provider";
import { CopyEditor, type CopyBag } from "@/components/locale-tabs";
import { CalendarSkeleton, InfoListSkeleton } from "@/components/skeletons";
import { Button, Field, inputClass, useToast } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { when, type VenueContentItem } from "@/lib/hospitality";
import type { Venue } from "@/types";
import { useEffect, useMemo, useState } from "react";

const types = ["event", "post", "announcement", "promotion", "special_offer"] as const;

export default function ContentPage() {
  const { token } = useAuth();
  const { t } = useI18n();
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
    translations: {} as CopyBag,
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
    body.translations = form.translations;
    if (form.type === "promotion" || form.type === "special_offer") body.days_of_week = [1, 2, 3, 4, 5];
    try {
      await api("/business/content", { method: "POST", token, body });
      toast(t("content.saved"));
      setForm({ ...form, title: "", body: "", event_category: "", terms: "", translations: {} });
      await load();
    } catch (reason) {
      toast(reason instanceof ApiError ? reason.message : t("content.failed"));
    }
  }

  async function act(id: number, action: "publish" | "duplicate" | "delete" | "archive" | "cancel") {
    if (!token) return;
    if (action === "publish") await api(`/business/content/${id}/publish`, { method: "POST", token });
    if (action === "duplicate") await api(`/business/content/${id}/duplicate`, { method: "POST", token });
    if (action === "delete") await api(`/business/content/${id}`, { method: "DELETE", token });
    if (action === "archive" || action === "cancel") {
      const item = items.find((entry) => entry.id === id);
      await api(`/business/content/${id}`, { method: "PUT", token, body: { title: item?.source?.title ?? item?.title, type: item?.type, status: action === "archive" ? "archived" : "cancelled" } });
    }
    toast(t("content.updated"));
    await load();
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="font-serif text-4xl">{t("content.heading")}</h1>
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
      <h1 className="font-serif text-4xl">{t("content.heading")}</h1>
      <div className="flex gap-2 overflow-x-auto">
        {["all", "draft", "scheduled", "published", "completed"].map((status) => (
          <button key={status} type="button" onClick={() => setFilter(status)} className={`min-h-11 rounded-full px-4 text-sm ${filter === status ? "bg-sea text-snow" : "bg-paper"}`}>
            {t(`content.filter.${status}`)}
          </button>
        ))}
      </div>
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-serif text-2xl">{t("content.calendar")}</h2>
          <input aria-label={t("content.month")} type="month" className={inputClass + " max-w-48"} value={month} onChange={(event) => setMonth(event.target.value)} />
        </div>
        <div className="grid grid-cols-7 gap-1 text-xs">
          {[1, 2, 3, 4, 5, 6, 7].map((day) => <div key={day} className="px-1 text-muted">{t(`day.${day}`).slice(0, 3)}</div>)}
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
        <h2 className="font-serif text-2xl md:col-span-2">{t("content.new")}</h2>
        <Field label={t("content.place")}>
          <ComboBox value={form.venue_id} onChange={(value) => setForm({ ...form, venue_id: value })} options={venues.map((venue) => ({ value: String(venue.id), label: venue.name }))} />
        </Field>
        <Field label={t("content.kind")}>
          <ComboBox value={form.type} onChange={(value) => setForm({ ...form, type: value })} options={types.map((type) => ({ value: type, label: t(`content.type.${type}`) }))} />
        </Field>
        <CopyEditor
          fields={[
            { id: "title", label: t("content.title") },
            { id: "body", label: t("content.text"), rows: 4, required: false },
            ...(form.type === "event" ? [{ id: "event_category", label: t("field.category"), required: false }] : []),
            ...(form.type === "promotion" || form.type === "special_offer" ? [{ id: "terms", label: t("content.terms"), required: false }] : []),
          ]}
          source={{ title: form.title, body: form.body, event_category: form.event_category, terms: form.terms }}
          setSource={(id, value) => setForm({ ...form, [id]: value })}
          bag={form.translations}
          setBag={(translations) => setForm({ ...form, translations })}
        />
        <Field label={t("content.publish")}>
          <ComboBox value={form.status} onChange={(value) => setForm({ ...form, status: value })} options={[
            { value: "draft", label: t("field.draft") },
            { value: "published", label: t("content.now") },
            { value: "scheduled", label: t("content.schedule") },
          ]} />
        </Field>
        {form.status === "scheduled" ? <Field label={t("content.scheduled")}><input type="datetime-local" className={inputClass} value={form.scheduled_at} onChange={(event) => setForm({ ...form, scheduled_at: event.target.value })} /></Field> : null}
        <Field label={t("content.expires")}><input type="datetime-local" className={inputClass} value={form.expires_at} onChange={(event) => setForm({ ...form, expires_at: event.target.value })} /></Field>
        {form.type === "event" ? (
          <>
            <Field label={t("content.start")}><input type="datetime-local" className={inputClass} value={form.event_start_at} onChange={(event) => setForm({ ...form, event_start_at: event.target.value })} /></Field>
            <Field label={t("content.end")}><input type="datetime-local" className={inputClass} value={form.event_end_at} onChange={(event) => setForm({ ...form, event_end_at: event.target.value })} /></Field>
            <Field label={t("field.price")}><input type="number" min={0} className={inputClass} value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} /></Field>
            <Field label={t("content.capacity")}><input type="number" min={1} className={inputClass} value={form.capacity} onChange={(event) => setForm({ ...form, capacity: event.target.value })} /></Field>
            <Field label={t("content.signup")}>
              <ComboBox value={form.registration_mode} onChange={(value) => setForm({ ...form, registration_mode: value })} options={[
                { value: "none", label: t("content.none") },
                { value: "registration", label: t("content.registration") },
                { value: "table_reservation", label: t("content.table") },
                { value: "capacity", label: t("content.byCapacity") },
              ]} />
            </Field>
          </>
        ) : null}
        {form.type === "promotion" || form.type === "special_offer" ? (
          <>
            <Field label={t("content.validFrom")}><input type="datetime-local" className={inputClass} value={form.valid_from} onChange={(event) => setForm({ ...form, valid_from: event.target.value })} /></Field>
            <Field label={t("content.validUntil")}><input type="datetime-local" className={inputClass} value={form.valid_until} onChange={(event) => setForm({ ...form, valid_until: event.target.value })} /></Field>
            <Field label={t("content.fromHour")}><input type="time" className={inputClass} value={form.daily_start} onChange={(event) => setForm({ ...form, daily_start: event.target.value })} /></Field>
            <Field label={t("content.untilHour")}><input type="time" className={inputClass} value={form.daily_end} onChange={(event) => setForm({ ...form, daily_end: event.target.value })} /></Field>
          </>
        ) : null}
        {form.type === "announcement" ? <Field label={t("content.priority")}><input type="number" min={0} max={5} className={inputClass} value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })} /></Field> : null}
        <Button type="submit">{t("action.save")}</Button>
      </form>
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.id} className="rounded-lg border border-line bg-paper p-4">
            <p className="text-xs text-muted">{t(`content.type.${item.type}`)} · {t(`cstatus.${item.status}`)} · {item.venue?.name}</p>
            <h3 className="font-serif text-2xl">{item.title}</h3>
            <p className="text-sm text-muted">{when(item.event_start_at || item.scheduled_at || item.published_at)}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button onClick={() => void act(item.id, "publish")}>{t("action.publish")}</Button>
              <Button variant="secondary" onClick={() => void act(item.id, "duplicate")}>{t("action.duplicate")}</Button>
              <Button variant="secondary" onClick={() => void act(item.id, "archive")}>{t("action.archive")}</Button>
              <Button variant="ghost" onClick={() => void act(item.id, "cancel")}>{t("action.cancel")}</Button>
              <Button variant="danger" onClick={() => void act(item.id, "delete")}>{t("action.delete")}</Button>
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
