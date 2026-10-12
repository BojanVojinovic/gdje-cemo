import { LegalDocument } from "@/components/legal-document";
import { legalDocument } from "@/lib/legal";
import { normalizeLocale } from "@/lib/i18n";
import type { Metadata } from "next";
import { cookies } from "next/headers";

export async function generateMetadata(): Promise<Metadata> {
  const locale = normalizeLocale((await cookies()).get("gdje-locale")?.value);
  return { title: legalDocument(locale, "terms").title };
}

export default async function TermsPage() {
  const locale = normalizeLocale((await cookies()).get("gdje-locale")?.value);
  return <LegalDocument doc={legalDocument(locale, "terms")} />;
}
