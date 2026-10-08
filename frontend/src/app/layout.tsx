import type { Metadata, Viewport } from "next";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { Providers } from "@/components/providers";
import { SiteFooter, SiteHeader } from "@/components/shell";
import { brandName } from "@/lib/brand-name";
import { normalizeLocale } from "@/lib/i18n";

const source = Source_Sans_3({ subsets: ["latin", "latin-ext", "cyrillic", "cyrillic-ext"], variable: "--font-source" });
const fraunces = Fraunces({ subsets: ["latin", "latin-ext"], variable: "--font-fraunces" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: brandName, template: `%s · ${brandName}` },
  description: "Find restaurants, cafés, bars and clubs in Montenegro.",
  applicationName: brandName,
  appleWebApp: { capable: true, title: brandName, statusBarStyle: "default" },
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f5f9" },
    { media: "(prefers-color-scheme: dark)", color: "#07090f" },
  ],
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
