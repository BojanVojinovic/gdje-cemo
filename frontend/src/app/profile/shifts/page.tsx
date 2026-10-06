"use client";

import { useI18n } from "@/components/i18n-provider";
import { InfoListSkeleton } from "@/components/skeletons";
import { Button, useToast } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import Link from "next/link";
import { useEffect, useState } from "react";

type Person = { id: number; name: string };
type Shift = {
  id: number;
  role: string | null;
  notes: string | null;
  starts_at: string;
  ends_at: string;
  venue: { name: string } | null;
  planned: Person | null;
  covering: Person | null;
  working: Person | null;
  colleagues?: { id: number; name: string }[];
  pending_swap?: { id: number } | null;
};
type Swap = { id: number; note: string | null; from: Person | null; to: Person | null; shift: Shift | null };

export default function MyShiftsPage() {
  const { token, user, ready } = useAuth();
  const { t } = useI18n();
  const toast = useToast();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [incoming, setIncoming] = useState<Swap[]>([]);
  const [outgoing, setOutgoing] = useState<Swap[]>([]);
  const [targets, setTargets] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!token) return;
    const response = await api<{ shifts: Shift[]; incoming: Swap[]; outgoing: Swap[] }>("/me/shifts", { token });
    setShifts(response.data.shifts);
    setIncoming(response.data.incoming);
    setOutgoing(response.data.outgoing);
  }

  useEffect(() => {
    if (!token) {
      if (ready) setLoading(false);
      return;
    }
    void load().finally(() => setLoading(false));
  }, [token, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  async function act(path: string, ok: string) {
    if (!token) return;
    try {
      await api(path, { method: "POST", token });
      toast(ok);
      await load();
    } catch (error) {
      toast(error instanceof ApiError ? error.message : t("api.failed"));
    }
  }

  async function requestSwap(shift: Shift) {
    if (!token || !targets[shift.id]) return;
    try {
      await api(`/me/shifts/${shift.id}/swaps`, { method: "POST", token, body: { to_user_id: Number(targets[shift.id]) } });
      toast(t("shift.swap"));
      await load();
    } catch (error) {
      toast(error instanceof ApiError ? error.message : t("api.failed"));
    }
  }

  if (!ready || loading) return <InfoListSkeleton />;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <Link href="/profile" className="text-sm text-sea">{t("nav.profile")}</Link>
      <h1 className="font-serif text-4xl">{t("shift.mine")}</h1>
      {incoming.length ? (
        <section className="space-y-2">
          <h2 className="font-serif text-2xl">{t("shift.incoming")}</h2>
          {incoming.map((swap) => (
            <article key={swap.id} className="border border-line bg-paper p-4 text-sm">
              <p>{swap.from?.name} · {swap.shift?.venue?.name} · {when(swap.shift?.starts_at)}</p>
              {swap.note ? <p className="text-muted">{swap.note}</p> : null}
              <div className="mt-3 flex gap-2">
                <Button onClick={() => void act(`/me/shift-swaps/${swap.id}/accept`, t("shift.accept"))}>{t("shift.accept")}</Button>
                <Button variant="secondary" onClick={() => void act(`/me/shift-swaps/${swap.id}/decline`, t("shift.decline"))}>{t("shift.decline")}</Button>
              </div>
            </article>
          ))}
        </section>
      ) : null}
      {outgoing.length ? (
        <section className="space-y-2">
          <h2 className="font-serif text-2xl">{t("shift.outgoing")}</h2>
          {outgoing.map((swap) => (
            <article key={swap.id} className="border border-line bg-paper p-4 text-sm">
              <p>{swap.to?.name} · {swap.shift?.venue?.name}</p>
              <Button className="mt-3" variant="secondary" onClick={() => void act(`/me/shift-swaps/${swap.id}/cancel`, t("shift.withdraw"))}>{t("shift.withdraw")}</Button>
            </article>
          ))}
        </section>
      ) : null}
      {shifts.length === 0 && incoming.length === 0 && outgoing.length === 0 ? <p className="text-sm text-muted">{t("shift.empty")}</p> : null}
      {shifts.map((shift) => (
        <article key={shift.id} className="border border-line bg-paper p-4 text-sm">
          <p className="font-medium">{shift.venue?.name}</p>
          <p>{when(shift.starts_at)} – {when(shift.ends_at)} · {shift.role ? t(`staff.role.${shift.role}`) : ""}</p>
          <p>{t("shift.planned")}: {shift.planned?.name}</p>
          {shift.covering ? <p className="font-semibold">{t("shift.covering")}: {shift.covering.name}</p> : null}
          {shift.notes ? <p className="text-muted">{shift.notes}</p> : null}
          {shift.working?.id === user?.id && !shift.pending_swap && shift.colleagues?.length ? (
            <form className="mt-3 flex flex-wrap items-center gap-2" onSubmit={(event) => { event.preventDefault(); void requestSwap(shift); }}>
              <select className="min-h-11 rounded-full border border-line bg-paper px-3" value={targets[shift.id] ?? ""} onChange={(event) => setTargets({ ...targets, [shift.id]: event.target.value })}>
                <option value="">{t("shift.colleague")}</option>
                {shift.colleagues.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
              </select>
              <Button type="submit" variant="secondary">{t("shift.swap")}</Button>
            </form>
          ) : null}
        </article>
      ))}
    </div>
  );
}

function when(value?: string) {
  if (!value) return "";
  return new Date(value).toLocaleString([], { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}
