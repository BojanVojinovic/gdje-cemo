"use client";

import { useI18n } from "@/components/i18n-provider";

export const menuMarkIds = ["spicy", "vegetarian", "vegan", "gluten_free"] as const;

export type MenuMark = (typeof menuMarkIds)[number];

export function MenuMarks({ marks }: { marks?: string[] | null }) {
  const { t } = useI18n();
  const shown = (marks ?? []).filter((mark) => menuMarkIds.includes(mark as MenuMark));
  if (!shown.length) return null;

  return (
    <span className="mt-1 flex flex-wrap gap-1">
      {shown.map((mark) => (
        <span key={mark} className="rounded-full border border-line px-2 py-0.5 text-[11px] text-ink">{t(`menu.mark.${mark}`)}</span>
      ))}
    </span>
  );
}

export function MenuMarkFields({ marks, onChange, setup = false }: { marks: string[]; onChange: (marks: string[]) => void; setup?: boolean }) {
  const { t } = useI18n();

  return (
    <div data-setup={setup ? "menu-marks" : undefined} className="flex flex-wrap gap-x-4 gap-y-1">
      {menuMarkIds.map((mark) => (
        <label key={mark} className="flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={marks.includes(mark)}
            onChange={() => onChange(marks.includes(mark) ? marks.filter((item) => item !== mark) : [...marks, mark])}
          />
          {t(`menu.mark.${mark}`)}
        </label>
      ))}
    </div>
  );
}
