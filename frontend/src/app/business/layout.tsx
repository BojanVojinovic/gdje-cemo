import type { Metadata } from "next";
import { BusinessFrame } from "@/components/business-frame";

export const metadata: Metadata = { title: "Biznis", robots: { index: false, follow: false } };

export default function BusinessLayout({ children }: { children: React.ReactNode }) {
  return <BusinessFrame>{children}</BusinessFrame>;
}
