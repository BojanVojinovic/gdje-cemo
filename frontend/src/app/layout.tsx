import type { Metadata } from "next";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { Providers } from "@/components/providers";
import { SiteFooter, SiteHeader } from "@/components/shell";
import { normalizeLocale } from "@/lib/i18n";

const source = Source_Sans_3({ subsets: ["latin", "latin-ext"], variable: "--font-source" });
const fraunces = Fraunces({ subsets: ["latin", "latin-ext"], variable: "--font-fraunces" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "Gdje ćemo", template: "%s · Gdje ćemo" },
  description: "Find restaurants, cafés, bars and clubs in Montenegro.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = normalizeLocale((await cookies()).get("gdje-locale")?.value);
  return (
    <html lang={locale} data-scroll-behavior="smooth" className={`${source.variable} ${fraunces.variable} h-full`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col antialiased" suppressHydrationWarning>
        <Providers locale={locale}>
          <SiteHeader />
          <main className="flex-1 pb-16 md:pb-0">{children}</main>
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}
