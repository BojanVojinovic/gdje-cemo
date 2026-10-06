"use client";

import { InfoListSkeleton } from "@/components/skeletons";
import { Button, EmptyState, useToast } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Review } from "@/types";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function AdminReviewsPage() {
  const { token } = useAuth();
  const toast = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!token) return;
    setLoading(true);
    try {
      const response = await api<Review[]>("/admin/reviews", { token });
      setReviews(response.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load().catch(() => undefined); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  async function moderate(review: Review, status: string) {
    if (!token) return;
    await api(`/admin/reviews/${review.id}`, { method: "PUT", token, body: { status } });
    toast("Recenzija je moderirana.");
    await load();
  }

  async function remove(review: Review) {
    if (!token || !window.confirm("Obrisati recenziju?")) return;
    await api(`/admin/reviews/${review.id}`, { method: "DELETE", token });
    await load();
  }

  async function bulk(action: "hide" | "publish" | "delete") {
    if (!token || !selected.length || !window.confirm("Primijeniti radnju na označene recenzije?")) return;
    await api("/admin/reviews/bulk", { method: "POST", token, body: { action, ids: selected } });
    setSelected([]);
    await load();
  }

  return (
    <div className="space-y-4">
      <h1 className="font-serif text-4xl">Recenzije</h1>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => bulk("hide")}>Sakrij</Button>
        <Button variant="secondary" onClick={() => bulk("publish")}>Objavi</Button>
        <Button variant="danger" onClick={() => bulk("delete")}>Obriši</Button>
      </div>
      {loading ? <InfoListSkeleton /> : null}
      {!loading && reviews.length === 0 ? <EmptyState title="Nema recenzija." body="Kad korisnici ostave utiske, pojaviće se ovdje." /> : null}
      {!loading ? <ul className="space-y-3">
        {reviews.map((review) => (
          <li key={review.id} className="rounded-lg border border-line bg-paper p-4 text-sm">
            <label className="flex items-start gap-3">
              <input type="checkbox" checked={selected.includes(review.id)} onChange={() => setSelected((current) => current.includes(review.id) ? current.filter((id) => id !== review.id) : [...current, review.id])} />
              <span>
                <Link href={`/venue/${review.venue?.slug}`} className="font-medium">{review.venue?.name}</Link> · {review.user?.name} · {review.rating}/5 · {review.status}
                <span className="mt-1 block">{review.body}</span>
              </span>
            </label>
            <div className="mt-3 flex gap-3">
              <button type="button" onClick={() => moderate(review, review.status === "hidden" ? "published" : "hidden")}>{review.status === "hidden" ? "Objavi" : "Sakrij"}</button>
              <button type="button" className="text-coral" onClick={() => remove(review)}>Obriši</button>
            </div>
          </li>
        ))}
      </ul> : null}
    </div>
  );
}
