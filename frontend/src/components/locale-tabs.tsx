"use client";

import { useI18n } from "@/components/i18n-provider";
import { Field, inputClass } from "@/components/ui";
import { useState } from "react";

export const copyLocales = [
  { id: "cnr", label: "CG" },
  { id: "en", label: "EN" },
  { id: "ru", label: "RU" },
  { id: "it", label: "IT" },
  { id: "de", label: "DE" },
  { id: "fr", label: "FR" },
  { id: "es", label: "ES" },
] as const;

export type CopyLocale = (typeof copyLocales)[number]["id"];
export type CopyBag = Partial<Record<Exclude<CopyLocale, "cnr">, Record<string, string>>>;

export function emptyCopy(): CopyBag {
  return {};
}

export function copyValue(bag: CopyBag | null | undefined, locale: CopyLocale, field: string, source: string): string {
  if (locale === "cnr") return source;
  return bag?.[locale]?.[field] ?? "";
}

export function writeCopy(bag: CopyBag, locale: CopyLocale, field: string, value: string, source: string, setSource: (value: string) => void): CopyBag {
  if (locale === "cnr") {
    setSource(value);
    return bag;
  }
  return {
    ...bag,
    [locale]: { ...bag[locale], [field]: value },
  };
}

export function LocaleTabs({ value, onChange }: { value: CopyLocale; onChange: (locale: CopyLocale) => void }) {
  const { t } = useI18n();

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1" role="tablist" aria-label={t("copy.languages")}>
        {copyLocales.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={value === item.id}
            className={`min-h-9 rounded-full px-3 text-xs font-semibold ${value === item.id ? "bg-sea text-snow" : "border border-line text-muted"}`}
            onClick={() => onChange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted">{value === "cnr" ? t("copy.required") : t("copy.optional")}</p>
    </div>
  );
}

export function CopyEditor({
  fields,
  source,
  setSource,
  bag,
  setBag,
}: {
  fields: { id: string; label: string; rows?: number; required?: boolean }[];
  source: Record<string, string>;
  setSource: (id: string, value: string) => void;
  bag: CopyBag;
  setBag: (bag: CopyBag) => void;
}) {
  const [tab, setTab] = useState<CopyLocale>("cnr");

  return (
    <div className="space-y-3 md:col-span-2">
      <LocaleTabs value={tab} onChange={setTab} />
      {fields.map((field) => {
        const value = copyValue(bag, tab, field.id, source[field.id] ?? "");
        const onChange = (next: string) => {
          if (tab === "cnr") setSource(field.id, next);
          else setBag(writeCopy(bag, tab, field.id, next, source[field.id] ?? "", () => undefined));
        };
        return (
          <Field key={field.id} label={field.label}>
            {field.rows ? (
              <textarea className={`${inputClass} min-h-32 py-3`} rows={field.rows} required={tab === "cnr" && field.required !== false} value={value} onChange={(event) => onChange(event.target.value)} />
            ) : (
              <input className={inputClass} required={tab === "cnr" && field.required !== false} value={value} onChange={(event) => onChange(event.target.value)} />
            )}
          </Field>
        );
      })}
    </div>
  );
}
