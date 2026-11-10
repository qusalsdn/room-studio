/**
 * 내부 길이 단위는 mm 정수. 화면 표시는 기본 cm.
 */
export type Mm = number;

export type DisplayUnit = "cm" | "mm" | "m";

export function cmToMm(cm: number): Mm {
  return Math.round(cm * 10);
}

export function mmToCm(mm: Mm): number {
  return mm / 10;
}

export function formatLength(mm: Mm, unit: DisplayUnit = "cm"): string {
  switch (unit) {
    case "mm":
      return `${Math.round(mm)}mm`;
    case "m":
      return `${trimZeros((mm / 1000).toFixed(2))}m`;
    case "cm":
      return `${trimZeros((mm / 10).toFixed(1))}cm`;
  }
}

function trimZeros(s: string): string {
  return s.includes(".") ? s.replace(/\.?0+$/, "") : s;
}
