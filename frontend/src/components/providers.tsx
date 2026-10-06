"use client";

import { I18nProvider } from "@/components/i18n-provider";
import { LiveNotifications } from "@/components/live-notifications";
import { AuthProvider } from "@/lib/auth";
import type { Locale } from "@/lib/i18n";
import { ToastProvider } from "@/components/ui";

export function Providers({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return (
    <I18nProvider locale={locale}>
      <AuthProvider>
        <ToastProvider>
          <LiveNotifications />
          {children}
        </ToastProvider>
      </AuthProvider>
    </I18nProvider>
  );
}
