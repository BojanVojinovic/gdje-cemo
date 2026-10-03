import type { Metadata } from "next";

export const metadata: Metadata = { title: "Email potvrđen", robots: { index: false } };

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const params = await searchParams;
  const success = params.status === "success";
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="font-serif text-4xl">{success ? "Email je potvrđen" : "Potvrda emaila"}</h1>
      <p className="mt-3 text-sm text-muted">
        {success ? "Možete se prijaviti." : "Otvorite link iz emaila. U lokalnom okruženju link je u Laravel logu."}
      </p>
    </div>
  );
}
