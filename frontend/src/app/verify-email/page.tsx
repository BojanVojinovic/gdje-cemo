"use client";

import { AuthCard } from "@/app/login/page";
import { useI18n } from "@/components/i18n-provider";
import { Button, Field, inputClass } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { User } from "@/types";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function VerifyForm() {
  const params = useSearchParams();
  const { t } = useI18n();
  const { refresh } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(params.get("status") === "success" ? t("auth.confirm") : null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const response = await api<{ token: string; user: User }>("/auth/email/verify-code", {
        method: "POST",
        body: { email, code },
      });
      window.localStorage.setItem("gdje-cemo-token", response.data.token);
      await refresh();
      router.push("/");
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : t("api.failed"));
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    setLoading(true);
    try {
      const response = await api("/auth/email/resend", { method: "POST", body: { email } });
      setMessage(response.message);
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : t("api.failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard title={t("auth.verifyTitle")}>
      <p className="mb-4 text-sm text-muted">{t("auth.codeHint")}</p>
      {message ? <p className="mb-4 text-sm">{message}</p> : null}
      <form onSubmit={submit} className="space-y-3">
        <Field label={t("auth.email")}><input className={inputClass} type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></Field>
        <Field label={t("auth.code")}><input className={inputClass} inputMode="numeric" autoComplete="one-time-code" maxLength={6} required value={code} onChange={(event) => setCode(event.target.value)} /></Field>
        <Button type="submit" loading={loading} className="w-full">{t("auth.confirm")}</Button>
      </form>
      <button type="button" className="mt-4 min-h-11 text-sm text-sea" onClick={() => void resend()}>{t("auth.resend")}</button>
    </AuthCard>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyForm />
    </Suspense>
  );
}
