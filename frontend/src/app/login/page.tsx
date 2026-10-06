"use client";

import { useI18n } from "@/components/i18n-provider";
import { Button, Field, inputClass } from "@/components/ui";
import { ApiError, fieldError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const { login } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!email.includes("@") || password.length < 8) {
      setError("Unesite ispravan email i lozinku od najmanje 8 karaktera.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      router.push("/");
    } catch (reason) {
      setFieldErrors({
        email: fieldError(reason, "email") ?? "",
      });
      setError(reason instanceof ApiError ? reason.message : t("auth.loginFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard title={t("auth.loginTitle")}>
      <form onSubmit={submit} className="space-y-4">
        <Field label={t("auth.email")} error={fieldErrors.email || undefined}><input className={inputClass} type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></Field>
        <Field label={t("auth.password")}><input className={inputClass} type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></Field>
        {error ? <p className="text-sm text-coral">{error}</p> : null}
        <Button type="submit" loading={loading} className="w-full">{t("auth.signIn")}</Button>
      </form>
      <p className="mt-4 text-sm"><Link href="/forgot-password" className="text-sea">{t("auth.forgot")}</Link></p>
      <p className="mt-2 text-sm">{t("auth.noAccount")} <Link href="/register" className="text-sea">{t("auth.registerLink")}</Link></p>
    </AuthCard>
  );
}

export function AuthCard({ title, children }: { title: string; children: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-4 py-14 md:grid-cols-2 md:items-center">
      <div className="hidden md:block">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sea">Gdje ćemo</p>
        <h2 className="mt-3 font-serif text-5xl leading-tight">{t("auth.aside")}</h2>
      </div>
      <div>
        <h1 className="font-serif text-4xl">{title}</h1>
        <div className="mt-6 border border-line bg-paper p-6">{children}</div>
      </div>
    </div>
  );
}
