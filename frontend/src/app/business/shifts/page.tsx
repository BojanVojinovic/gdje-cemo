"use client";

import { useI18n } from "@/components/i18n-provider";
import { InfoListSkeleton } from "@/components/skeletons";
import { Button, Field, inputClass, useToast } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Venue } from "@/types";
import { useEffect, useState } from "react";

type Person = { id: number; name: string };
type Shift = {
  id: number;
  role: string | null;
  notes: string | null;
  status: string;
  starts_at: string;
  ends_at: string;
  planned: Person | null;
  covering: Person | null;
  working: Person | null;
  pending_swap: { id: number; from: Person | null; to: Person | null; note: string | null } | null;
};
type Colleague = { id: number; name: string; roles: string[] };

export default function BusinessShiftsPage() {
  const { token } = useAuth();
  const { t } = useI18n();
  const toast = useToast();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [venueId, setVenueId] = useState<number | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [colleagues, setColleagues] = useState<Colleague[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ user_id: "", role: "waiter", starts_at: "", ends_at: "", notes: "" });

  async function load(id: number) {
    if (!token) return;
    const response = await api<{ shifts: Shift[]; colleagues: Colleague[] }>(`/business/venues/${id}/shifts`, { token });
    setShifts(response.data.shifts.filter((shift) => shift.status === "scheduled"));
    setColleagues(response.data.colleagues);
  }

  useEffect(() => {
    if (!token) return;
    api<Venue[]>("/business/venues", { token })
      .then((response) => {
        setVenues(response.data);
        if (response.data[0]) setVenueId(response.data[0].id);
      })
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!token || !venueId) return;
    void load(venueId).catch(() => undefined);
  }, [token, venueId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!token || !venueId) return;
    try {
      await api(`/business/venues/${venueId}/shifts`, { method: "POST", token, body: { ...form, user_id: Number(form.user_id) } });
      toast(t("shift.save"));
      setForm({ ...form, notes: "" });
      await load(venueId);
    } catch (error) {
      toast(error instanceof ApiError ? error.message : t("api.failed"));
    }
  }

  async function cancel(id: number) {
    if (!token || !venueId) return;
    await api(`/business/shifts/${id}`, { method: "DELETE", token });
    await load(venueId);
  }

  if (loading) return <InfoListSkeleton />;

  const grouped = groupByDay(shifts);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-serif text-4xl">{t("shift.title")}</h1>
        <select className="min-h-11 rounded-full border border-line bg-paper px-3 text-sm" value={venueId ?? ""} onChange={(event) => setVenueId(Number(event.target.value))}>
          {venues.map((venue) => <option key={venue.id} value={venue.id}>{venue.name}</option>)}
        </select>
      </div>
      <form onSubmit={save} className="grid gap-3 border border-line bg-paper p-4 sm:grid-cols-2">
        <h2 className="font-serif text-2xl sm:col-span-2">{t("shift.add")}</h2>
        <Field label={t("shift.worker")}>
          <select className={inputClass} required value={form.user_id} onChange={(event) => setForm({ ...form, user_id: event.target.value })}>
            <option value="">{t("shift.colleague")}</option>
            {colleagues.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
          </select>
        </Field>
        <Field label={t("shift.role")}>
          <select className={inputClass} value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
            <option value="waiter">{t("staff.role.waiter")}</option>
            <option value="bar">{t("staff.role.bar")}</option>
            <option value="kitchen">{t("staff.role.kitchen")}</option>
            <option value="delivery">{t("staff.role.delivery")}</option>
          </select>
        </Field>
        <Field label={t("shift.start")}><input className={inputClass} type="datetime-local" required value={form.starts_at} onChange={(event) => setForm({ ...form, starts_at: event.target.value })} /></Field>
        <Field label={t("shift.end")}><input className={inputClass} type="datetime-local" required value={form.ends_at} onChange={(event) => setForm({ ...form, ends_at: event.target.value })} /></Field>
        <Field label={t("shift.notes")}><input className={inputClass} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></Field>
        <div className="flex items-end"><Button type="submit">{t("shift.save")}</Button></div>
      </form>
      {shifts.length === 0 ? <p className="text-sm text-muted">{t("shift.empty")}</p> : null}
      {grouped.map(([day, rows]) => (
        <section key={day}>
          <h2 className="font-serif text-2xl">{day}</h2>
          <ul className="mt-2 space-y-2">
            {rows.map((shift) => (
              <li key={shift.id} className="border border-line bg-paper p-4 text-sm">
                <p className="font-medium">{time(shift.starts_at)}–{time(shift.ends_at)} · {shift.role ? t(`staff.role.${shift.role}`) : ""}</p>
                <p>{t("shift.planned")}: {shift.planned?.name}</p>
                {shift.covering ? <p>{t("shift.covering")}: {shift.covering.name}</p> : <p>{t("shift.working")}: {shift.working?.name}</p>}
                {shift.pending_swap ? <p className="text-muted">{shift.pending_swap.from?.name} → {shift.pending_swap.to?.name}</p> : null}
                {shift.notes ? <p className="text-muted">{shift.notes}</p> : null}
                <Button className="mt-3" variant="secondary" onClick={() => void cancel(shift.id)}>{t("shift.cancel")}</Button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function groupByDay(shifts: Shift[]): [string, Shift[]][] {
  const map = new Map<string, Shift[]>();
  for (const shift of shifts) {
    const day = shift.starts_at.slice(0, 10);
    map.set(day, [...(map.get(day) ?? []), shift]);
  }
  return [...map.entries()];
}

function time(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
