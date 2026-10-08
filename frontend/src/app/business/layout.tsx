import { BusinessFrame } from "@/components/business-frame";
import { normalizeLocale, translate } from "@/lib/i18n";
import type { Metadata } from "next";
import { cookies } from "next/headers";

export async function generateMetadata(): Promise<Metadata> {
  const locale = normalizeLocale((await cookies()).get("gdje-locale")?.value);
  return { title: translate(locale, "nav.business"), robots: { index: false, follow: false } };
}

export default function BusinessLayout({ children }: { children: React.ReactNode }) {
  return <BusinessFrame>{children}</BusinessFrame>;
}
