const dateLocales: Record<string, string> = {
  cnr: "sr-Latn-ME",
  en: "en",
  de: "de",
  es: "es",
  fr: "fr",
  it: "it",
  ru: "ru",
};

export function formatDate(value?: string | null, locale = "cnr") {
  if (!value) return "";
  return new Intl.DateTimeFormat(dateLocales[locale] ?? "sr-Latn-ME", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

export function formatPrice(value: number) {
  return new Intl.NumberFormat("sr-Latn-ME", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(value);
}

export function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
