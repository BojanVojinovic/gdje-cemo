"use client";

import { Button, EmptyState, Field, Skeleton, inputClass, useToast } from "@/components/ui";
import { api, ApiError, fieldError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import type { Review, User } from "@/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function ProfilePage() {
  const { user, token, ready, setUser } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [form, setForm] = useState({ first_name: "", last_name: "", username: "", email: "", phone: "" });
  const [password, setPassword] = useState({ current_password: "", password: "", password_confirmation: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  useEffect(() => {
    if (!user) return;
    setForm({
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username,
      email: user.email,
      phone: user.phone ?? "",
    });
  }, [user]);

  useEffect(() => {
    if (!token) return;
    api<Review[]>("/me/reviews", { token }).then((response) => setReviews(response.data)).catch(() => undefined);
  }, [token]);

  if (!ready || !user) return <div className="mx-auto max-w-3xl px-4 py-10"><Skeleton className="h-40" /></div>;

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    if (!token) return;
    setLoading(true);
    try {
      const response = await api<User>("/me", { method: "PUT", token, body: form });
      setUser(response.data);
      toast(response.message ?? "Profil je sačuvan.");
      setErrors({});
    } catch (reason) {
      if (reason instanceof ApiError) {
        const mapped: Record<string, string> = {};
        Object.entries(reason.errors ?? {}).forEach(([key, messages]) => { mapped[key] = messages[0]; });
        setErrors(mapped);
      }
    } finally {
      setLoading(false);
    }
  }

  async function savePassword(event: React.FormEvent) {
    event.preventDefault();
    if (!token) return;
    if (password.password.length < 8) {
      setErrors({ password: "Nova lozinka mora imati najmanje 8 karaktera." });
      return;
    }
    setLoading(true);
    try {
      const response = await api("/me/password", { method: "PUT", token, body: password });
      toast(response.message ?? "Lozinka je promijenjena.");
      setPassword({ current_password: "", password: "", password_confirmation: "" });
    } catch (reason) {
      toast(fieldError(reason, "current_password") || (reason instanceof ApiError ? reason.message : "Promjena nije uspjela."));
    } finally {
      setLoading(false);
    }
  }

  async function uploadAvatar(file: File) {
    if (!token) return;
    const data = new FormData();
    data.append("image", file);
    try {
      const response = await api<User>("/me/avatar", { method: "POST", token, formData: data });
      setUser(response.data);
      toast("Fotografija je sačuvana.");
    } catch (reason) {
      toast(reason instanceof ApiError ? reason.message : "Otpremanje nije uspjelo.");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-10">
      <header className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-sea text-lg text-snow">
          {user.avatar_url ? <img src={user.avatar_url} alt="" className="h-full w-full object-cover" /> : user.first_name[0]}
        </div>
        <div>
          <h1 className="font-serif text-4xl">{user.name}</h1>
          <p className="text-sm text-muted">Član od {formatDate(user.created_at)}</p>
        </div>
      </header>
      <nav className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Dijelovi profila">
        {[
          ["/saved", "Sačuvano"],
          ["/profile/reservations", "Rezervacije"],
          ["/profile/notifications", "Obavještenja"],
          ["#recenzije", "Recenzije"],
        ].map(([href, label]) => (
          <Link key={href} href={href} className="border border-line bg-paper px-3 py-4 text-sm font-semibold">{label}</Link>
        ))}
      </nav>
      <label className="inline-flex min-h-11 cursor-pointer items-center text-sm text-sea">
        Promijeni fotografiju
        <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadAvatar(file); }} />
      </label>
      <form onSubmit={saveProfile} className="space-y-3 rounded-lg border border-line bg-paper p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Ime" error={errors.first_name}><input className={inputClass} value={form.first_name} onChange={(event) => setForm({ ...form, first_name: event.target.value })} /></Field>
          <Field label="Prezime" error={errors.last_name}><input className={inputClass} value={form.last_name} onChange={(event) => setForm({ ...form, last_name: event.target.value })} /></Field>
        </div>
        <Field label="Korisničko ime" error={errors.username}><input className={inputClass} value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} /></Field>
        <Field label="Email" error={errors.email}><input className={inputClass} type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></Field>
        <Field label="Telefon" error={errors.phone}><input className={inputClass} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></Field>
        <Button type="submit" loading={loading}>Sačuvaj profil</Button>
      </form>
      <form onSubmit={savePassword} className="space-y-3 rounded-lg border border-line bg-paper p-5">
        <h2 className="font-serif text-2xl">Lozinka</h2>
        <Field label="Trenutna lozinka"><input className={inputClass} type="password" value={password.current_password} onChange={(event) => setPassword({ ...password, current_password: event.target.value })} /></Field>
        <Field label="Nova lozinka" error={errors.password}><input className={inputClass} type="password" value={password.password} onChange={(event) => setPassword({ ...password, password: event.target.value })} /></Field>
        <Field label="Potvrda"><input className={inputClass} type="password" value={password.password_confirmation} onChange={(event) => setPassword({ ...password, password_confirmation: event.target.value })} /></Field>
        <Button type="submit" variant="secondary">Promijeni lozinku</Button>
      </form>
      <section id="recenzije" className="space-y-3 scroll-mt-24">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl">Moje recenzije</h2>
          <Link href="/saved" className="text-sm text-sea">Sačuvana mjesta</Link>
        </div>
        {reviews.length === 0 ? <EmptyState title="Još nema recenzija." body="Kad ostavite utisak o nekom mjestu, pojaviće se ovdje." /> : (
          <ul className="space-y-3">
            {reviews.map((review) => (
              <li key={review.id} className="rounded-lg border border-line bg-paper p-4">
                <Link href={`/venue/${review.venue?.slug}`} className="font-medium">{review.venue?.name}</Link>
                <p className="mt-1 text-sm">{review.body}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
