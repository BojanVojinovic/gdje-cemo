"use client";

import { ComboBox } from "@/components/combo-box";
import { useI18n } from "@/components/i18n-provider";
import { UserTableSkeleton } from "@/components/skeletons";
import { Button, EmptyState, inputClass, useToast } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { PageMeta, User } from "@/types";
import { useEffect, useState } from "react";

export default function AdminUsersPage() {
  const { token } = useAuth();
  const { t } = useI18n();
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
      toast(t("admin.savedUser"));
      await load();
    } catch (error) {
      toast(error instanceof ApiError ? error.message : t("admin.updateFailed"));
    }
  }

  async function remove(user: User) {
    if (!token || !window.confirm(t("admin.deleteUser", { email: user.email }))) return;
    await api(`/admin/users/${user.id}`, { method: "DELETE", token });
    await load();
  }

  async function bulk(action: "disable" | "enable") {
    if (!token || !selected.length || !window.confirm(t("admin.bulkConfirm"))) return;
    await api("/admin/users/bulk", { method: "POST", token, body: { action, ids: selected } });
    setSelected([]);
    await load();
  }

  return (
    <div className="space-y-4">
      <h1 className="font-serif text-4xl">{t("admin.users")}</h1>
      <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); void load(); }}>
        <input className={inputClass} value={q} onChange={(event) => setQ(event.target.value)} placeholder={t("field.searchUsers")} />
        <Button type="submit" variant="secondary">{t("action.search")}</Button>
      </form>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => bulk("disable")}>{t("admin.disableSelected")}</Button>
        <Button variant="secondary" onClick={() => bulk("enable")}>{t("admin.enableSelected")}</Button>
      </div>
      {loading ? <UserTableSkeleton /> : null}
      {!loading && users.length === 0 ? <EmptyState title={t("admin.noUsers")} body={t("admin.noUsersHint")} /> : null}
      <div className="overflow-x-auto rounded-lg border border-line bg-paper">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-muted"><tr><th className="p-3" /><th className="p-3">{t("admin.name")}</th><th className="p-3">{t("admin.email")}</th><th className="p-3">{t("admin.role")}</th><th className="p-3">{t("admin.status")}</th><th className="p-3" /></tr></thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t border-line">
                <td className="p-3"><input type="checkbox" checked={selected.includes(user.id)} onChange={() => setSelected((current) => current.includes(user.id) ? current.filter((id) => id !== user.id) : [...current, user.id])} aria-label={t("admin.select", { name: user.name })} /></td>
                <td className="p-3">{user.name}</td>
                <td className="p-3">{user.email}</td>
                <td className="p-3">
                  <ComboBox ariaLabel={t("admin.roleFor", { name: user.name })} value={user.role} onChange={(value) => update(user, { role: value })} options={[
                    { value: "customer", label: t("role.customer") },
                    { value: "business", label: t("role.business") },
                    { value: "admin", label: t("role.admin") },
                  ]} />
                </td>
                <td className="p-3">{user.is_active ? t("status.active") : t("status.disabled")}</td>
                <td className="p-3 text-right">
                  <button type="button" className="mr-3" onClick={() => update(user, { is_active: !user.is_active })}>{user.is_active ? t("admin.disable") : t("admin.enable")}</button>
                  <button type="button" className="text-coral" onClick={() => remove(user)}>{t("action.delete")}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {meta ? <p className="text-sm text-muted">{t("admin.accountCount", { n: meta.total })}</p> : null}
    </div>
  );
}
