import type { DisplayUnit } from "@/domain/units";
import { formatLength } from "@/domain/units";

export { formatLength };

const PYEONG_M2 = 3.305785;

/** mm² → "12.0m² (3.6평)" */
export function formatArea(mm2: number): string {
  const m2 = mm2 / 1_000_000;
  return `${m2.toFixed(1)}m² (${(m2 / PYEONG_M2).toFixed(1)}평)`;
}

/** 표시 단위 값 → mm */
export function toMm(value: number, unit: DisplayUnit): number {
  switch (unit) {
    case "mm":
      return Math.round(value);
    case "cm":
      return Math.round(value * 10);
    case "m":
      return Math.round(value * 1000);
  }
}

/** mm → 표시 단위 값 */
export function fromMm(mm: number, unit: DisplayUnit): number {
  switch (unit) {
    case "mm":
      return mm;
    case "cm":
      return mm / 10;
    case "m":
      return mm / 1000;
  }
}
