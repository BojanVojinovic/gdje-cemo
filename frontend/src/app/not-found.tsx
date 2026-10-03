import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Stranica nije pronađena" };

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <h1 className="font-serif text-4xl">Ova stranica ne postoji.</h1>
      <p className="mt-3 text-sm text-muted">Mjesto je možda uklonjeno ili je adresa pogrešna.</p>
      <Link href="/places" className="mt-6 inline-flex min-h-11 items-center text-sea">Nazad na mjesta</Link>
    </div>
  );
}
