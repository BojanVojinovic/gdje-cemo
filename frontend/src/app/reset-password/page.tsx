"use client";

import { AuthCard } from "@/app/login/page";
import { useI18n } from "@/components/i18n-provider";
import { Button, Field, inputClass } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}

function ResetForm() {
  const { t } = useI18n();
  const params = useSearchParams();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < 8 || password !== confirmation) {
      setMessage("Lozinke moraju imati najmanje 8 karaktera i moraju se poklapati.");
      return;
    }
    setLoading(true);
    try {
      const response = await api("/auth/reset-password", {
        method: "POST",
        body: {
          email: params.get("email"),
          token: params.get("token"),
          password,
          password_confirmation: confirmation,
        },
      });
      setMessage(response.message);
      window.setTimeout(() => router.push("/login"), 800);
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Reset nije uspio.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard title="Postavi lozinku">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Nova lozinka"><input className={inputClass} type="password" value={password} onChange={(event) => setPassword(event.target.value)} required /></Field>
        <Field label="Potvrda"><input className={inputClass} type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required /></Field>
        {message ? <p className="text-sm">{message}</p> : null}
        <Button type="submit" loading={loading}>{t("action.save")}</Button>
      </form>
    </AuthCard>
  );
}
