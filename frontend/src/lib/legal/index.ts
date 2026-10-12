import type { Locale } from "@/lib/i18n";
import cnr from "@/lib/legal/cnr";
import de from "@/lib/legal/de";
import en from "@/lib/legal/en";
import es from "@/lib/legal/es";
import fr from "@/lib/legal/fr";
import it from "@/lib/legal/it";
import ru from "@/lib/legal/ru";
import type { LegalDoc } from "@/lib/legal/types";

const bundles = { en, cnr, ru, it, de, fr, es };

export function legalDocument(locale: Locale, kind: "privacy" | "terms"): LegalDoc {
  return (bundles[locale] ?? en)[kind];
}
