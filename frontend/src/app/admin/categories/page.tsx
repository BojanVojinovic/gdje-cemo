"use client";

import { ComboBox } from "@/components/combo-box";
import { useI18n } from "@/components/i18n-provider";
import { InfoListSkeleton } from "@/components/skeletons";
import { Button, EmptyState, Field, inputClass, useToast } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Category } from "@/types";
import { useEffect, useState } from "react";

export default function AdminCategoriesPage() {
  const { token } = useAuth();
  const { t } = useI18n();
  const toast = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const response = await api<Category[]>("/categories");
      setCategories(response.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (!token) return;
    try {
      await api("/admin/categories", { method: "POST", token, body: { name, parent_id: parentId ? Number(parentId) : null } });
      setName("");
      toast(t("cat.created"));
      await load();
    } catch (error) {
      toast(error instanceof ApiError ? error.message : t("cat.failed"));
    }
  }

  async function rename(category: Category, next: string) {
    if (!token || !next.trim()) return;
    await api(`/admin/categories/${category.id}`, { method: "PUT", token, body: { name: next } });
    await load();
  }

  async function remove(category: Category) {
    if (!token || !window.confirm(t("cat.deleteAsk", { name: category.name }))) return;
    try {
      await api(`/admin/categories/${category.id}`, { method: "DELETE", token });
      await load();
    } catch (error) {
      toast(error instanceof ApiError ? error.message : t("cat.deleteFailed"));
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="font-serif text-4xl">{t("admin.categories")}</h1>
      <form onSubmit={create} className="grid gap-3 rounded-lg border border-line bg-paper p-4 md:grid-cols-[1fr_1fr_auto]">
        <Field label={t("field.name")}><input className={inputClass} value={name} onChange={(event) => setName(event.target.value)} required /></Field>
        <Field label={t("cat.parent")}>
          <ComboBox value={parentId} onChange={setParentId} options={[{ value: "", label: t("cat.root") }, ...categories.map((category) => ({ value: String(category.id), label: category.name }))]} />
        </Field>
        <div className="self-end"><Button type="submit">{t("action.add")}</Button></div>
      </form>
      {loading ? <InfoListSkeleton /> : null}
      {!loading && categories.length === 0 ? <EmptyState title={t("cat.empty")} body={t("cat.emptyHint")} /> : null}
      {!loading ? <ul className="space-y-3">
        {categories.map((category) => (
          <li key={category.id} className="rounded-lg border border-line bg-paper p-4">
            <div className="flex items-center justify-between gap-3">
              <input className={inputClass} defaultValue={category.name} onBlur={(event) => { if (event.target.value !== category.name) void rename(category, event.target.value); }} />
              <button type="button" className="text-sm text-coral" onClick={() => remove(category)}>{t("action.delete")}</button>
            </div>
            <ul className="mt-2 space-y-2">
              {category.children?.map((child) => (
                <li key={child.id} className="flex items-center gap-2 pl-4">
                  <input className={inputClass} defaultValue={child.name} onBlur={(event) => { if (event.target.value !== child.name) void rename(child, event.target.value); }} />
                  <button type="button" className="text-sm text-coral" onClick={() => remove(child)}>{t("action.delete")}</button>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul> : null}
    </div>
  );
}
