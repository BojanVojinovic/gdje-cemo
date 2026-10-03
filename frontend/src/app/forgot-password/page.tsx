"use client";

import { AuthCard } from "@/app/login/page";
import { Button, Field, inputClass } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await api("/auth/forgot-password", { method: "POST", body: { email } });
      setMessage(response.message);
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Slanje nije uspjelo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard title="Nova lozinka">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email"><input className={inputClass} type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></Field>
        {message ? <p className="text-sm">{message}</p> : null}
        <Button type="submit" loading={loading}>Pošalji link</Button>
      </form>
    </AuthCard>
  );
}
