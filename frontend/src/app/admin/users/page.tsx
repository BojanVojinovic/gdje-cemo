"use client";

import { ComboBox } from "@/components/combo-box";
import { Button, EmptyState, Skeleton, inputClass, useToast } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { PageMeta, User } from "@/types";
import { useEffect, useState } from "react";

export default function AdminUsersPage() {
  const { token } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  async function load(query = q) {
    if (!token) return;
    setLoading(true);
    const response = await api<User[]>(`/admin/users?q=${encodeURIComponent(query)}`, { token });
    setUsers(response.data);
    setMeta(response.meta ?? null);
    setLoading(false);
  }

  useEffect(() => { void load("").catch(() => setLoading(false)); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  async function update(user: User, payload: Record<string, unknown>) {
    if (!token) return;
    try {
      await api(`/admin/users/${user.id}`, { method: "PUT", token, body: payload });
      toast("Korisnik je sačuvan.");
      await load();
    } catch (error) {
      toast(error instanceof ApiError ? error.message : "Izmjena nije uspjela.");
    }
  }

  async function remove(user: User) {
    if (!token || !window.confirm(`Obrisati nalog ${user.email}?`)) return;
    await api(`/admin/users/${user.id}`, { method: "DELETE", token });
    await load();
  }

  async function bulk(action: "disable" | "enable") {
    if (!token || !selected.length || !window.confirm("Primijeniti radnju na označene naloge?")) return;
    await api("/admin/users/bulk", { method: "POST", token, body: { action, ids: selected } });
    setSelected([]);
    await load();
  }

  return (
    <div className="space-y-4">
      <h1 className="font-serif text-4xl">Korisnici</h1>
      <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); void load(); }}>
        <input className={inputClass} value={q} onChange={(event) => setQ(event.target.value)} placeholder="Ime ili email" />
        <Button type="submit" variant="secondary">Traži</Button>
      </form>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => bulk("disable")}>Onemogući označene</Button>
        <Button variant="secondary" onClick={() => bulk("enable")}>Uključi označene</Button>
      </div>
      {loading ? <Skeleton className="h-40" /> : null}
      {!loading && users.length === 0 ? <EmptyState title="Nema korisnika." body="Promijenite pretragu." /> : null}
      <div className="overflow-x-auto rounded-lg border border-line bg-paper">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-muted"><tr><th className="p-3" /><th className="p-3">Ime</th><th className="p-3">Email</th><th className="p-3">Uloga</th><th className="p-3">Status</th><th className="p-3" /></tr></thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t border-line">
                <td className="p-3"><input type="checkbox" checked={selected.includes(user.id)} onChange={() => setSelected((current) => current.includes(user.id) ? current.filter((id) => id !== user.id) : [...current, user.id])} aria-label={`Odaberi ${user.name}`} /></td>
                <td className="p-3">{user.name}</td>
                <td className="p-3">{user.email}</td>
                <td className="p-3">
                  <ComboBox ariaLabel={`Uloga za ${user.name}`} value={user.role} onChange={(value) => update(user, { role: value })} options={[
                    { value: "customer", label: "korisnik" },
                    { value: "business", label: "biznis" },
                    { value: "admin", label: "admin" },
                  ]} />
                </td>
                <td className="p-3">{user.is_active ? "aktivan" : "isključen"}</td>
                <td className="p-3 text-right">
                  <button type="button" className="mr-3" onClick={() => update(user, { is_active: !user.is_active })}>{user.is_active ? "Onemogući" : "Uključi"}</button>
                  <button type="button" className="text-coral" onClick={() => remove(user)}>Obriši</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {meta ? <p className="text-sm text-muted">{meta.total} naloga</p> : null}
    </div>
  );
}
