import type { CSSProperties } from "react";

export function brandButtonStyle(color?: string | null, ink?: string | null): CSSProperties | undefined {
  if (!color) return undefined;
  return { backgroundColor: color, color: ink || "#f7f9ff" };
}
