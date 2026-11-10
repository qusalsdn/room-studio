"use client";

import type { ReactNode } from "react";
import type { DisplayUnit } from "@/domain/units";
import { fromMm, toMm } from "@/lib/format";

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm tabular-nums outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";

/**
 * mm 값을 표시 단위로 보여주고, 블러/엔터 시 mm로 바꿔 onCommit을 부른다.
 * 외부 값이 바뀌면 key로 다시 마운트해서 입력값을 맞춘다.
 */
export function LengthField({
  valueMm,
  unit,
  onCommit,
  ariaLabel,
  min = 1,
}: {
  valueMm: number;
  unit: DisplayUnit;
  onCommit: (mm: number) => boolean | void;
  ariaLabel: string;
  min?: number;
}) {
  const display = Number(fromMm(valueMm, unit).toFixed(unit === "m" ? 3 : 1));
  const commit = (el: HTMLInputElement) => {
    const v = Number(el.value);
    if (!Number.isFinite(v) || toMm(v, unit) < min) {
      el.value = String(display);
      return;
    }
    const mm = toMm(v, unit);
    if (mm === valueMm) return;
    if (onCommit(mm) === false) el.value = String(display);
  };
  return (
    <div className="flex items-center gap-1">
      <input
        key={`${valueMm}-${unit}`}
        type="number"
        inputMode="decimal"
        step={unit === "m" ? 0.01 : unit === "cm" ? 0.5 : 1}
        defaultValue={display}
        aria-label={ariaLabel}
        className={inputClass}
        onBlur={(e) => commit(e.currentTarget)}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            e.currentTarget.value = String(display);
            e.currentTarget.blur();
          }
        }}
      />
      <span className="w-6 shrink-0 text-xs text-neutral-500">{unit}</span>
    </div>
  );
}

export function TextField({
  value,
  onCommit,
  ariaLabel,
}: {
  value: string;
  onCommit: (v: string) => void;
  ariaLabel: string;
}) {
  return (
    <input
      key={value}
      defaultValue={value}
      aria-label={ariaLabel}
      className={inputClass}
      onBlur={(e) => {
        const v = e.currentTarget.value.trim();
        if (v && v !== value) onCommit(v);
        else e.currentTarget.value = value;
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
    />
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2 border-b border-neutral-200 px-4 py-4 last:border-b-0">
      <h2 className="text-xs font-semibold tracking-wide text-neutral-500">{title}</h2>
      {children}
    </section>
  );
}

export function Button({
  children,
  onClick,
  variant = "default",
  disabled,
  title,
  active,
  autoFocus,
}: {
  children: ReactNode;
  onClick: () => void;
  variant?: "default" | "primary" | "danger" | "ghost";
  disabled?: boolean;
  title?: string;
  active?: boolean;
  autoFocus?: boolean;
}) {
  const base =
    "inline-flex items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40";
  const styles = {
    default: "border border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50",
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    danger: "border border-red-200 bg-white text-red-600 hover:bg-red-50",
    ghost: "text-neutral-700 hover:bg-neutral-100",
  }[variant];
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      aria-pressed={active}
      autoFocus={autoFocus}
      className={`${base} ${styles} ${active ? "bg-blue-50 text-blue-700 ring-1 ring-blue-300" : ""}`}
    >
      {children}
    </button>
  );
}
