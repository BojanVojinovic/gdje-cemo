"use client";

import { AuthCard } from "@/app/login/page";
import { useI18n } from "@/components/i18n-provider";
import { Button, Field, inputClass } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RegisterPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [form, setForm] = useState({ first_name: "", last_name: "", username: "", email: "", phone: "", password: "", password_confirmation: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function set(key: string, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (form.first_name.trim().length < 2) next.first_name = t("auth.errName");
    if (form.last_name.trim().length < 2) next.last_name = t("auth.errLast");
    if (!/^[A-Za-z0-9_-]{3,40}$/.test(form.username)) next.username = t("auth.errUser");
    if (!form.email.includes("@")) next.email = t("auth.errEmail");
    if (form.password.length < 8) next.password = t("auth.errPass");
    if (form.password !== form.password_confirmation) next.password_confirmation = t("auth.errMatch");
    setErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      await api("/auth/register", { method: "POST", body: form });
      router.push(`/verify-email?email=${encodeURIComponent(form.email)}`);
    } catch (reason) {
      if (reason instanceof ApiError) {
        const mapped: Record<string, string> = {};
        Object.entries(reason.errors ?? {}).forEach(([key, messages]) => {
          mapped[key] = messages[0];
        });
        setErrors(mapped);
        setMessage(reason.message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard title={t("auth.registerTitle")}>
      {message ? <p className="mb-4 text-sm">{message}</p> : null}
      <form onSubmit={submit} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("auth.first")} error={errors.first_name}><input className={inputClass} value={form.first_name} onChange={(event) => set("first_name", event.target.value)} required /></Field>
          <Field label={t("auth.last")} error={errors.last_name}><input className={inputClass} value={form.last_name} onChange={(event) => set("last_name", event.target.value)} required /></Field>
        </div>
        <Field label={t("auth.username")} error={errors.username}><input className={inputClass} value={form.username} onChange={(event) => set("username", event.target.value)} required /></Field>
        <Field label={t("auth.email")} error={errors.email}><input className={inputClass} type="email" value={form.email} onChange={(event) => set("email", event.target.value)} required /></Field>
        <Field label={t("auth.phone")} error={errors.phone}><input className={inputClass} value={form.phone} onChange={(event) => set("phone", event.target.value)} /></Field>
        <Field label={t("auth.password")} error={errors.password}><input className={inputClass} type="password" value={form.password} onChange={(event) => set("password", event.target.value)} required /></Field>
        <Field label={t("auth.password2")} error={errors.password_confirmation}><input className={inputClass} type="password" value={form.password_confirmation} onChange={(event) => set("password_confirmation", event.target.value)} required /></Field>
        <Button type="submit" loading={loading} className="w-full">{t("auth.create")}</Button>
      </form>
      <p className="mt-4 text-sm">{t("auth.haveAccount")} <Link href="/login" className="text-sea">{t("auth.login")}</Link></p>
    </AuthCard>
  );
}
