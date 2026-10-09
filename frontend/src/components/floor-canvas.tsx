"use client";

import { useI18n } from "@/components/i18n-provider";
import { seatsLabel, type FloorTable } from "@/lib/hospitality";
import { useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

const shapeClass: Record<string, string> = {
  round: "rounded-full",
  oval: "rounded-[50%]",
  square: "rounded-2xl",
  rectangle: "rounded-xl",
  custom: "rounded-sm border-dashed",
};

const stateClass: Record<string, string> = {
  available: "border-success bg-[#e7f2ec] text-success",
  selected: "border-sea bg-[#f6ebe8] text-sea ring-2 ring-sea",
  reserved: "border-warning bg-[#f8f1e4] text-warning [background-image:repeating-linear-gradient(45deg,transparent,transparent_6px,rgba(138,90,18,0.16)_6px,rgba(138,90,18,0.16)_8px)]",
  occupied: "border-coral bg-[#f8ebe9] text-coral [background-image:repeating-linear-gradient(90deg,transparent,transparent_4px,rgba(159,45,34,0.14)_4px,rgba(159,45,34,0.14)_7px)]",
  unavailable: "border-muted bg-cream text-muted [background-image:repeating-linear-gradient(135deg,transparent,transparent_4px,rgba(109,98,88,0.16)_4px,rgba(109,98,88,0.16)_6px)]",
};

const tableStates = ["available", "selected", "reserved", "occupied", "unavailable"] as const;

export function TableLegend() {
  const { t } = useI18n();
  return (
    <ul className="flex flex-wrap gap-2 text-xs">
      {tableStates.map((key) => {
        const label = t(`table.${key}`);
        return (
        <li key={key} className={`inline-flex items-center gap-2 rounded-md border px-2 py-1 ${stateClass[key]}`}>
          <span aria-hidden="true">{key === "available" ? "○" : key === "selected" ? "●" : key === "reserved" ? "◐" : key === "occupied" ? "■" : "×"}</span>
          {label}
        </li>
        );
      })}
    </ul>
  );
}

export function FloorCanvas({
  tables,
  width,
  height,
  backgroundUrl,
  selectedId,
  editable = false,
  compact = false,
  onSelect,
  onChange,
}: {
  tables: FloorTable[];
  width: number;
  height: number;
  backgroundUrl?: string | null;
  selectedId?: number | null;
  editable?: boolean;
  compact?: boolean;
  onSelect?: (id: number) => void;
  onChange?: (table: FloorTable) => void;
}) {
  const { t } = useI18n();
  const frame = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(compact ? 0 : 1);

  useLayoutEffect(() => {
    if (!compact || !frame.current) return;
    const node = frame.current;
    function measure() {
      setScale(Math.min(1, node.clientWidth / width));
    }
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [compact, width]);

  const fitted = compact ? scale : 1;
  const canvas = (
      <div
        className="relative"
        style={{
          width: width * fitted,
          height: height * fitted,
          backgroundImage: backgroundUrl ? `url(${backgroundUrl})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {tables.map((table) => {
          const state = selectedId === table.id ? "selected" : table.public_state || "available";
          return (
            <button
              key={table.id}
              type="button"
              aria-pressed={selectedId === table.id}
              aria-label={`${table.name}, ${seatsLabel(table.capacity_min, table.capacity_max, t)}, ${t(`table.${state}`)}${table.zone ? `, ${table.zone}` : ""}`}
              className={`absolute flex flex-col items-center justify-center border-2 px-1 text-center leading-tight ${compact ? "text-[10px]" : "text-[11px]"} ${shapeClass[table.shape] ?? shapeClass.square} ${stateClass[state] ?? stateClass.available}`}
              style={{
                left: table.position_x * fitted,
                top: table.position_y * fitted,
                width: table.width * fitted,
                height: table.height * fitted,
                transform: `rotate(${table.rotation}deg)`,
              }}
              onPointerDown={(event) => startDrag(event, table, editable, onSelect, onChange)}
            >
              <span className="font-medium" style={{ transform: `rotate(${-table.rotation}deg)` }}>{table.name}</span>
              {compact ? null : <span style={{ transform: `rotate(${-table.rotation}deg)` }}>{seatsLabel(table.capacity_min, table.capacity_max, t)}</span>}
              {compact ? null : <span style={{ transform: `rotate(${-table.rotation}deg)` }}>{t(`table.${state}`)}</span>}
              {editable ? (
                <span
                  role="presentation"
                  className="absolute -bottom-1 -right-1 h-4 w-4 rounded-sm border border-snow bg-paper"
                  onPointerDown={(event) => startResize(event, table, onChange)}
                />
              ) : null}
            </button>
          );
        })}
      </div>
  );

  if (compact) {
    return (
      <div ref={frame} className="w-full max-w-md overflow-hidden rounded-lg border border-line bg-paper">
        {canvas}
      </div>
    );
  }

  return <div className="overflow-auto rounded-lg border border-line bg-paper">{canvas}</div>;
}

function startDrag(
  event: ReactPointerEvent,
  table: FloorTable,
  editable: boolean | undefined,
  onSelect?: (id: number) => void,
  onChange?: (table: FloorTable) => void,
) {
  onSelect?.(table.id);
  if (!editable || !onChange || (event.target as HTMLElement).dataset.resize === "1") return;
  const originX = table.position_x;
  const originY = table.position_y;
  const startX = event.clientX;
  const startY = event.clientY;

  function move(next: PointerEvent) {
    onChange?.({
      ...table,
      position_x: Math.max(0, Math.round(originX + next.clientX - startX)),
      position_y: Math.max(0, Math.round(originY + next.clientY - startY)),
    });
  }

  function up() {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
  }

  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
}

function startResize(event: ReactPointerEvent, table: FloorTable, onChange?: (table: FloorTable) => void) {
  event.stopPropagation();
  if (!onChange) return;
  const originW = table.width;
  const originH = table.height;
  const startX = event.clientX;
  const startY = event.clientY;

  function move(next: PointerEvent) {
    onChange?.({
      ...table,
      width: Math.min(400, Math.max(48, Math.round(originW + next.clientX - startX))),
      height: Math.min(400, Math.max(48, Math.round(originH + next.clientY - startY))),
    });
  }

  function up() {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
  }

  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
}
