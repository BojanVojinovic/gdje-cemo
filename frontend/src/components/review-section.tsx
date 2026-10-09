"use client";

import { ComboBox } from "@/components/combo-box";
import { useI18n } from "@/components/i18n-provider";
import { ReviewListSkeleton } from "@/components/skeletons";
import { Button, EmptyState, Field, Modal, Stars, inputClass, useToast } from "@/components/ui";
import { api, ApiError, fieldError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import type { PageMeta, Review } from "@/types";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function ReviewSection({
  venueId,
  distribution,
  average,
  count,
}: {
  venueId: number;
  distribution: Record<string, number>;
  average: number;
  count: number;
}) {
  const { token, user } = useAuth();
  const { locale, t } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState<Review | null>(null);

  async function load(nextPage = page) {
    setLoading(true);
    try {
      const response = await api<Review[]>(`/venues/${venueId}/reviews?page=${nextPage}`, { token });
      setReviews(response.data);
      setMeta(response.meta ?? null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, token, venueId]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!user || !token) {
      router.push("/login");
      return;
    }
    if (body.trim().length < 10) {
      setError(t("review.min"));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api(`/venues/${venueId}/reviews`, { method: "POST", token, body: { rating, body } });
      setBody("");
      toast(t("review.saved"));
      router.refresh();
      await load(1);
    } catch (reason) {
      setError(fieldError(reason, "body") || (reason instanceof ApiError ? reason.message : t("review.sendFailed")));
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(review: Review) {
    if (!token || !window.confirm(t("review.deleteConfirm"))) return;
    await api(`/reviews/${review.id}`, { method: "DELETE", token });
    toast(t("review.deleted"));
    router.refresh();
    await load(page);
  }

  const max = Math.max(1, ...Object.values(distribution).map(Number));

  return (
    <section className="space-y-5">
      <h2 className="font-serif text-3xl">{t("review.title")}</h2>
      <div className="flex items-end gap-6">
        <p className="font-serif text-5xl">{average.toFixed(1)}</p>
        <div className="flex-1 space-y-1">
          {[5, 4, 3, 2, 1].map((score) => (
            <div key={score} className="flex items-center gap-2 text-xs">
              <span className="w-3">{score}</span>
              <div className="h-2 flex-1 rounded-full bg-line">
                <div className="h-2 rounded-full bg-gold" style={{ width: `${((distribution[String(score)] ?? 0) / max) * 100}%` }} />
              </div>
            </div>
          ))}
          <p className="text-sm text-muted">{count} {t("venue.reviews")}</p>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-3 rounded-lg border border-line bg-paper p-4">
        <Field label={t("review.rating")}>
          <ComboBox value={String(rating)} onChange={(value) => setRating(Number(value))} options={[5, 4, 3, 2, 1].map((score) => ({ value: String(score), label: String(score) }))} />
        </Field>
        <Field label={t("review.bodyLabel")} error={error ?? undefined}>
          <textarea className={inputClass + " min-h-28 py-3"} value={body} onChange={(event) => setBody(event.target.value)} placeholder={t("review.hint")} />
        </Field>
        <Button type="submit" loading={submitting}>{t("review.publish")}</Button>
      </form>

      {loading ? <ReviewListSkeleton /> : null}
      {!loading && reviews.length === 0 ? <EmptyState title={t("review.empty")} body={t("review.emptyHint")} /> : null}
      {!loading ? <ul className="space-y-4">
        {reviews.map((review) => (
          <li key={review.id} className="rounded-lg border border-line bg-paper p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium">{review.user?.name}</p>
                <p className="text-xs text-muted">{formatDate(review.created_at, locale)}</p>
              </div>
              <Stars value={review.rating} size="sm" />
            </div>
            <p className="mt-3 text-sm leading-6">{review.body}</p>
            {review.response ? (
              <div className="mt-3 rounded-2xl bg-cream p-3 text-sm">
                <p className="font-medium">{t("review.venueReply")}</p>
                <p className="mt-1">{review.response.body}</p>
              </div>
            ) : null}
            {review.can_edit ? (
              <div className="mt-3 flex gap-2">
                <Button variant="secondary" onClick={() => setEditing(review)}>{t("review.edit")}</Button>
                <Button variant="ghost" onClick={() => remove(review)}>{t("action.delete")}</Button>
              </div>
            ) : null}
            <div className="mt-2">
              <ReportControl reviewId={review.id} />
            </div>
          </li>
        ))}
      </ul> : null}
      {meta && meta.last_page > 1 ? (
        <div className="flex justify-center gap-2">
          <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>{t("page.prev")}</Button>
          <Button variant="secondary" disabled={page >= meta.last_page} onClick={() => setPage((value) => value + 1)}>{t("page.next")}</Button>
        </div>
      ) : null}
      <EditReviewModal review={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); router.refresh(); void load(page); }} />
    </section>
  );
}

function ReportControl({ reviewId }: { reviewId: number }) {
  return <ReportInline type="review" id={reviewId} />;
}

export function EditReviewModal({ review, onClose, onSaved }: { review: Review | null; onClose: () => void; onSaved: () => void }) {
  const { token } = useAuth();
  const { t } = useI18n();
  const toast = useToast();
  const [rating, setRating] = useState(review?.rating ?? 5);
  const [body, setBody] = useState(review?.body ?? "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setRating(review?.rating ?? 5);
    setBody(review?.body ?? "");
  }, [review]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!review || !token) return;
    setLoading(true);
    try {
      await api(`/reviews/${review.id}`, { method: "PUT", token, body: { rating, body } });
      toast(t("review.updated"));
      onSaved();
    } catch (error) {
      toast(error instanceof ApiError ? error.message : t("review.updateFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={!!review} title={t("review.editTitle")} onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        <Field label={t("review.rating")}><ComboBox value={String(rating)} onChange={(value) => setRating(Number(value))} options={[5, 4, 3, 2, 1].map((score) => ({ value: String(score), label: String(score) }))} /></Field>
        <Field label={t("review.text")}><textarea className={inputClass + " min-h-28 py-3"} value={body} onChange={(event) => setBody(event.target.value)} /></Field>
        <Button type="submit" loading={loading}>{t("action.save")}</Button>
      </form>
    </Modal>
  );
}

export function ReportButton({ type, id }: { type: string; id: number }) {
  return <ReportInline type={type} id={id} />;
}

function ReportInline({ type, id }: { type: string; id: number }) {
  const { token, user } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("inappropriate");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!user || !token) {
      router.push("/login");
      return;
    }
    setLoading(true);
    try {
      await api("/reports", { method: "POST", token, body: { reportable_type: type, reportable_id: id, reason, description } });
      toast(t("report.sent"));
      setOpen(false);
    } catch (error) {
      toast(error instanceof ApiError ? error.message : t("report.failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button type="button" className="text-xs text-muted underline" onClick={() => setOpen(true)}>{t("report.action")}</button>
      <Modal open={open} title={t("report.title")} onClose={() => setOpen(false)}>
        <form onSubmit={submit} className="space-y-3">
          <Field label={t("report.reason")}>
            <ComboBox value={reason} onChange={setReason} options={[
              { value: "spam", label: t("report.spam") },
              { value: "inappropriate", label: t("report.inappropriate") },
              { value: "misleading", label: t("report.misleading") },
              { value: "incorrect_information", label: t("report.incorrect") },
              { value: "harassment", label: t("report.harassment") },
              { value: "other", label: t("report.other") },
            ]} />
          </Field>
          <Field label={t("report.details")}><textarea className={inputClass + " min-h-24 py-3"} value={description} onChange={(event) => setDescription(event.target.value)} /></Field>
          <Button type="submit" loading={loading}>{t("report.send")}</Button>
        </form>
      </Modal>
    </>
  );
}
