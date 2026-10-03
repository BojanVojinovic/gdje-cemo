import type { Metadata } from "next";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { SiteFooter, SiteHeader } from "@/components/shell";

const source = Source_Sans_3({ subsets: ["latin", "latin-ext"], variable: "--font-source" });
const fraunces = Fraunces({ subsets: ["latin", "latin-ext"], variable: "--font-fraunces" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "Gdje ćemo", template: "%s · Gdje ćemo" },
  description: "Otkrijte restorane, kafiće, barove i klubove u Crnoj Gori.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="sr" data-scroll-behavior="smooth" className={`${source.variable} ${fraunces.variable} h-full`}>
      <body className="flex min-h-full flex-col antialiased">
        <Providers>
          <SiteHeader />
          <main className="flex-1 pb-16 md:pb-0">{children}</main>
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}
