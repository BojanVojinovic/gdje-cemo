"use client";

import { Button, useToast } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { contentStatusLabel, contentTypeLabel, type VenueContentItem } from "@/lib/hospitality";
import { useEffect, useState } from "react";

export default function AdminContentPage() {
  const { token } = useAuth();
  const toast = useToast();
  const [items, setItems] = useState<VenueContentItem[]>([]);

  async function load() {
    if (!token) return;
    const response = await api<VenueContentItem[]>("/admin/content", { token });
    setItems(response.data);
  }

  useEffect(() => { void load().catch(() => undefined); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  async function moderate(id: number, body: Record<string, unknown>) {
    if (!token) return;
    await api(`/admin/content/${id}`, { method: "PUT", token, body });
    toast("Sadržaj je moderiran.");
    await load();
  }

  return (
    <div className="space-y-4">
      <h1 className="font-serif text-4xl">Sadržaj</h1>
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.id} className="rounded-lg border border-line bg-paper p-4">
            <p className="text-xs text-muted">{contentTypeLabel[item.type]} · {contentStatusLabel[item.status] ?? item.status} · {item.venue?.name}</p>
            <h2 className="font-serif text-2xl">{item.title}</h2>
            {item.body ? <p className="mt-2 text-sm">{item.body}</p> : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => void moderate(item.id, { status: "hidden" })}>Sakrij</Button>
              <Button variant="secondary" onClick={() => void moderate(item.id, { status: "published" })}>Vrati</Button>
              <Button variant="secondary" onClick={() => void moderate(item.id, { status: "cancelled" })}>Otkaži događaj</Button>
              <Button variant="danger" onClick={() => void moderate(item.id, { status: "hidden", publishing_suspended: true })}>Obustavi objavljivanje</Button>
              <Button variant="ghost" onClick={() => void moderate(item.id, { status: "published", publishing_suspended: false })}>Dozvoli objavljivanje</Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
