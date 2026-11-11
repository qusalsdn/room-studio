"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
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

/**
 * 선택지가 몇 개 안 될 때 쓰는 버튼 묶음.
 * 네이티브 select는 일부 환경에서 팝업이 엉뚱한 위치에 떠서 쓰지 않는다.
 */
export function Segmented<T extends string | number>({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; title?: string }[];
  ariaLabel: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="flex divide-x divide-neutral-300 rounded-md border border-neutral-300 text-sm"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          title={o.title}
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={`flex-1 px-2 py-1 whitespace-nowrap first:rounded-l-md last:rounded-r-md ${value === o.value ? "bg-blue-50 font-medium text-blue-700" : "text-neutral-600 hover:bg-neutral-50"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/**
 * 선택지가 많거나 늘어날 수 있을 때 쓰는 드롭다운. 네이티브 select 대신 직접 그린다.
 */
export function Dropdown<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [open]);

  const show = () => {
    setActive(
      Math.max(
        0,
        options.findIndex((o) => o.value === value),
      ),
    );
    setOpen(true);
  };
  const choose = (v: T) => {
    onChange(v);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={(e) => {
          if (e.key === "Escape" && open) {
            e.stopPropagation();
            setOpen(false);
          } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            if (!open) return show();
            const step = e.key === "ArrowDown" ? 1 : -1;
            setActive((i) => (i + step + options.length) % options.length);
          } else if ((e.key === "Enter" || e.key === " ") && open) {
            e.preventDefault();
            const o = options[active];
            if (o) choose(o.value);
          }
        }}
        className="flex max-w-56 items-center gap-1.5 rounded-md border border-neutral-300 bg-white py-1 pr-1.5 pl-2 text-sm hover:bg-neutral-50"
      >
        <span className="truncate">{current?.label ?? ""}</span>
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0 text-neutral-500" aria-hidden>
          <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label={ariaLabel}
          className="absolute top-full left-0 z-20 mt-1 max-h-64 min-w-full overflow-y-auto rounded-md border border-neutral-200 bg-white py-1 text-sm shadow-lg"
        >
          {options.map((o, i) => (
            <li
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              onPointerEnter={() => setActive(i)}
              onClick={() => choose(o.value)}
              className={`cursor-pointer px-3 py-1.5 whitespace-nowrap ${i === active ? "bg-neutral-100" : ""} ${o.value === value ? "font-medium text-blue-700" : "text-neutral-800"}`}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
