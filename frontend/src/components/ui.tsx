"use client";

import { useI18n } from "@/components/i18n-provider";
import { createContext, useContext, useState } from "react";

type Toast = { id: number; message: string };
const ToastContext = createContext<(message: string) => void>(() => undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  function push(message: string) {
    const id = Date.now();
    setToasts((current) => [...current, { id, message }]);
    window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 3200);
  }

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2 px-4 md:items-end">
        {toasts.map((toast) => (
          <div key={toast.id} role="status" className="pointer-events-auto max-w-sm border border-line bg-paper px-4 py-3 text-sm text-ink shadow-[var(--shadow-card)]">
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

export function Button({
  children,
  variant = "primary",
  className = "",
  loading = false,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger" | "outline"; loading?: boolean }) {
  const { t } = useI18n();
  const styles = {
    primary: "bg-sea text-snow hover:bg-sea-deep",
    secondary: "bg-paper text-ink border border-line hover:border-sea",
    outline: "border border-sea bg-transparent text-ink hover:bg-sea/15",
    ghost: "bg-transparent text-ink hover:bg-ink/10",
    danger: "bg-coral text-white hover:bg-sea-deep",
  }[variant];

  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold tracking-wide transition duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${className}`}
    >
      {loading ? t("action.wait") : children}
    </button>
  );
}

export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="text-[0.8rem] font-semibold uppercase tracking-[0.08em] text-muted">{label}</span>
      {children}
      {error ? <span className="block text-coral">{error}</span> : null}
    </label>
  );
}

export const inputClass =
  "min-h-11 w-full rounded-xl border border-line bg-void px-3 text-base text-ink outline-none transition placeholder:text-muted focus:border-sea focus:ring-2 focus:ring-sea/30";

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "open" | "closed" | "verified" | "warning" | "info" }) {
  const tones = {
    neutral: "bg-ink/10 text-ink",
    open: "bg-success/15 text-success",
    closed: "bg-ink/10 text-muted",
    verified: "bg-sea/20 text-ink",
    warning: "bg-warning/15 text-warning",
    info: "bg-sea/15 text-ink",
  }[tone];
  return <span className={`inline-flex items-center rounded-sm px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] ${tones}`}>{children}</span>;
}

export function Stars({ value, size = "md" }: { value: number; size?: "sm" | "md" }) {
  const { t } = useI18n();
  const rounded = Math.round(value);
  return (
    <span className={`tracking-tight text-gold ${size === "sm" ? "text-sm" : "text-base"}`} aria-label={t("stars.of", { value })}>
      {"★★★★★".slice(0, rounded)}
      <span className="text-line">{"★★★★★".slice(rounded)}</span>
    </span>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-paper px-6 py-14 text-center">
      <h2 className="font-serif text-2xl">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">{body}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-line/80 ${className}`} />;
}

export function SkeletonStack({ rows = 3, className = "h-24" }: { rows?: number; className?: string }) {
  const { t } = useI18n();
  return (
    <div className="space-y-3" aria-busy="true" aria-live="polite">
      <span className="sr-only">{t("state.loading")}</span>
      {Array.from({ length: rows }, (_, index) => <Skeleton key={index} className={className} />)}
    </div>
  );
}

export function Modal({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const { t } = useI18n();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 p-4 sm:items-center" role="presentation" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className="w-full max-w-lg rounded-xl bg-paper p-6 shadow-[var(--shadow-card)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id="dialog-title" className="font-serif text-2xl">{title}</h2>
          <button type="button" className="min-h-11 px-2 text-sm text-muted" onClick={onClose} aria-label={t("action.close")}>
            {t("action.close")}
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Pagination({ page, lastPage, onPage }: { page: number; lastPage: number; onPage: (page: number) => void }) {
  const { t } = useI18n();
  if (lastPage <= 1) return null;
  return (
    <nav className="flex items-center justify-center gap-2" aria-label={t("page.label")}>
      <Button variant="secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>{t("page.prev")}</Button>
      <span className="px-2 text-sm text-muted">{page} / {lastPage}</span>
      <Button variant="secondary" disabled={page >= lastPage} onClick={() => onPage(page + 1)}>{t("page.next")}</Button>
    </nav>
  );
}
