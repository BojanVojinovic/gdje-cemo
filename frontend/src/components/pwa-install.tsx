"use client";

import { useI18n } from "@/components/i18n-provider";
import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isInstalled() {
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}

export function PwaInstall() {
  const { t } = useI18n();
  const [mobile, setMobile] = useState(false);
  const [installed, setInstalled] = useState(true);
  const [ios, setIos] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [help, setHelp] = useState(false);

  useEffect(() => {
    setInstalled(isInstalled());
    setIos(/iPhone|iPad|iPod/.test(navigator.userAgent));
    const query = window.matchMedia("(max-width: 767px)");
    const sync = () => setMobile(query.matches);
    sync();
    query.addEventListener("change", sync);

    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
      setHelp(false);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      query.removeEventListener("change", sync);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!mobile || installed) return null;

  async function install() {
    if (!deferred) {
      setHelp(true);
      return;
    }
    await deferred.prompt();
    const choice = await deferred.userChoice;
    setDeferred(null);
    if (choice.outcome === "accepted") setInstalled(true);
  }

  return (
    <>
      <div className="border-b border-line bg-paper px-4 py-2 md:hidden">
        <button type="button" onClick={() => void install()} className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-sea px-4 text-sm font-semibold text-snow">
          {t("pwa.install")}
        </button>
      </div>
      {help ? (
        <div className="fixed inset-0 z-50 flex items-end md:hidden">
          <button type="button" className="absolute inset-0 bg-black/60" aria-label={t("nav.close")} onClick={() => setHelp(false)} />
          <div className="relative w-full border-t border-line bg-paper p-5 pb-8">
            <h2 className="font-serif text-2xl">{t("pwa.title")}</h2>
            <p className="mt-3 text-sm leading-6">{ios ? t("pwa.ios") : t("pwa.manual")}</p>
            <button type="button" className="mt-5 inline-flex min-h-11 items-center rounded-full border border-line px-4 text-sm font-semibold" onClick={() => setHelp(false)}>
              {t("nav.close")}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
