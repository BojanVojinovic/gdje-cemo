"use client";

import { useI18n } from "@/components/i18n-provider";
import { InfoListSkeleton } from "@/components/skeletons";
import { Button, useToast } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { VenueContentItem } from "@/lib/hospitality";
import { useEffect, useState } from "react";

export default function AdminContentPage() {
  const { token } = useAuth();
  const { t } = useI18n();
  const toast = useToast();
  const [items, setItems] = useState<VenueContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!token) return;
    setLoading(true);
    try {
      const response = await api<VenueContentItem[]>("/admin/content", { token });
      setItems(response.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load().catch(() => undefined); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  async function moderate(id: number, body: Record<string, unknown>) {
    if (!token) return;
    await api(`/admin/content/${id}`, { method: "PUT", token, body });
    toast(t("content.moderated"));
    await load();
  }

  return (
    <div className="space-y-4">
      <h1 className="font-serif text-4xl">{t("admin.content")}</h1>
      {loading ? <InfoListSkeleton /> : <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.id} className="rounded-lg border border-line bg-paper p-4">
            <p className="text-xs text-muted">{t(`content.type.${item.type}`)} · {t(`cstatus.${item.status}`)} · {item.venue?.name}</p>
            <h2 className="font-serif text-2xl">{item.title}</h2>
            {item.body ? <p className="mt-2 text-sm">{item.body}</p> : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => void moderate(item.id, { status: "hidden" })}>{t("action.hide")}</Button>
              <Button variant="secondary" onClick={() => void moderate(item.id, { status: "published" })}>{t("admin.restore")}</Button>
              <Button variant="secondary" onClick={() => void moderate(item.id, { status: "cancelled" })}>{t("action.cancel")}</Button>
              <Button variant="danger" onClick={() => void moderate(item.id, { status: "hidden", publishing_suspended: true })}>{t("admin.hidePublishing")}</Button>
              <Button variant="ghost" onClick={() => void moderate(item.id, { status: "published", publishing_suspended: false })}>{t("admin.allowPublishing")}</Button>
            </div>
          </li>
        ))}
      </ul>}
    </div>
  );
}
