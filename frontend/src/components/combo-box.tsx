"use client";

import { useI18n } from "@/components/i18n-provider";
import { inputClass } from "@/components/ui";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type ComboOption = { value: string; label: string; group?: string };

function fold(value: string) {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("sr");
}

export function ComboBox({
  value,
  onChange,
  options,
  placeholder,
  id,
  className = "",
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  options: ComboOption[];
  placeholder?: string;
  id?: string;
  className?: string;
  ariaLabel?: string;
}) {
  const autoId = useId();
  const listId = `${id ?? autoId}-list`;
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const panelNode = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [panel, setPanel] = useState<{ top?: number; bottom?: number; left: number; width: number; maxHeight: number } | null>(null);
  const selected = options.find((option) => option.value === value);
  const filtered = options.filter((option) => !query.trim() || fold(option.label).includes(fold(query.trim())));

  useLayoutEffect(() => {
    if (!open || !input.current) return;
    function place() {
      const rect = input.current?.getBoundingClientRect();
      if (!rect) return;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const openAbove = spaceBelow < 220 && spaceAbove > spaceBelow;
      const maxHeight = Math.max(120, Math.min(240, (openAbove ? spaceAbove : spaceBelow) - 12));
      setPanel(openAbove
        ? { bottom: window.innerHeight - rect.top + 6, left: rect.left, width: rect.width, maxHeight }
        : { top: rect.bottom + 6, left: rect.left, width: rect.width, maxHeight });
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, filtered.length]);

  useEffect(() => {
    if (!open) return;
    function outside(event: MouseEvent) {
      const target = event.target as Node;
      if (root.current?.contains(target) || panelNode.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, [open]);

  function choose(next: string) {
    onChange(next);
    setQuery("");
    setOpen(false);
  }

  function onKey(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActive((index) => Math.min(filtered.length - 1, index + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(0, index - 1));
    } else if (event.key === "Enter" && open && filtered[active]) {
      event.preventDefault();
      choose(filtered[active].value);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  const { t } = useI18n();
  const hint = placeholder ?? t("field.choose");
  let lastGroup = "";

  return (
    <div ref={root} className="relative">
      <input
        ref={input}
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        aria-autocomplete="list"
        autoComplete="off"
        className={`${inputClass} pr-12 ${className}`}
        placeholder={hint}
        value={open ? query : (selected?.label ?? "")}
        onFocus={() => { setQuery(""); setActive(0); setOpen(true); }}
        onChange={(event) => { setQuery(event.target.value); setActive(0); setOpen(true); }}
        onKeyDown={onKey}
      />
      <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-muted" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 16 16">
          <path d="M4 6.2 8 10l4-3.8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </span>
      {open && panel ? createPortal(
        <ul
          ref={panelNode}
          id={listId}
          role="listbox"
          className="fixed z-[80] overflow-auto rounded-xl border border-line bg-paper py-1 shadow-[var(--shadow-card)]"
          style={{ top: panel.top, bottom: panel.bottom, left: panel.left, width: panel.width, maxHeight: panel.maxHeight }}
        >
          {filtered.length === 0 ? <li className="px-3 py-2 text-sm text-muted">Nema poklapanja</li> : null}
          {filtered.map((option, index) => {
            const header = option.group && option.group !== lastGroup ? option.group : null;
            if (option.group) lastGroup = option.group;
            return (
              <li key={`${option.group ?? ""}-${option.value}-${option.label}`}>
                {header ? <p className="px-3 pt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{header}</p> : null}
                <button
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  className={`block w-full px-3 py-2 text-left text-sm ${index === active ? "bg-sea/20 text-ink" : "text-ink"}`}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => choose(option.value)}
                >
                  {option.label}
                </button>
              </li>
            );
          })}
        </ul>,
        document.body,
      ) : null}
    </div>
  );
}
