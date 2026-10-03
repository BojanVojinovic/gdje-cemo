"use client";

import { AuthCard } from "@/app/login/page";
import { Button, Field, inputClass } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import Link from "next/link";
import { useState } from "react";

export default function RegisterPage() {
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
    if (form.first_name.trim().length < 2) next.first_name = "Unesite ime.";
    if (form.last_name.trim().length < 2) next.last_name = "Unesite prezime.";
    if (!/^[A-Za-z0-9_-]{3,40}$/.test(form.username)) next.username = "Korisničko ime: 3–40 karaktera, slova, brojevi, crtica.";
    if (!form.email.includes("@")) next.email = "Email nije ispravan.";
    if (form.password.length < 8) next.password = "Lozinka mora imati najmanje 8 karaktera.";
    if (form.password !== form.password_confirmation) next.password_confirmation = "Lozinke se ne poklapaju.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      const response = await api("/auth/register", { method: "POST", body: form });
      setMessage(response.message);
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
    <AuthCard title="Novi nalog">
      {message ? <p className="mb-4 text-sm">{message} U lokalnom okruženju link za potvrdu stoji u backend logu.</p> : null}
      <form onSubmit={submit} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Ime" error={errors.first_name}><input className={inputClass} value={form.first_name} onChange={(event) => set("first_name", event.target.value)} required /></Field>
          <Field label="Prezime" error={errors.last_name}><input className={inputClass} value={form.last_name} onChange={(event) => set("last_name", event.target.value)} required /></Field>
        </div>
        <Field label="Korisničko ime" error={errors.username}><input className={inputClass} value={form.username} onChange={(event) => set("username", event.target.value)} required /></Field>
        <Field label="Email" error={errors.email}><input className={inputClass} type="email" value={form.email} onChange={(event) => set("email", event.target.value)} required /></Field>
        <Field label="Telefon" error={errors.phone}><input className={inputClass} value={form.phone} onChange={(event) => set("phone", event.target.value)} /></Field>
        <Field label="Lozinka" error={errors.password}><input className={inputClass} type="password" value={form.password} onChange={(event) => set("password", event.target.value)} required /></Field>
        <Field label="Potvrda lozinke" error={errors.password_confirmation}><input className={inputClass} type="password" value={form.password_confirmation} onChange={(event) => set("password_confirmation", event.target.value)} required /></Field>
        <Button type="submit" loading={loading} className="w-full">Kreiraj nalog</Button>
      </form>
      <p className="mt-4 text-sm">Već imaš nalog? <Link href="/login" className="text-sea">Prijava</Link></p>
    </AuthCard>
  );
}
