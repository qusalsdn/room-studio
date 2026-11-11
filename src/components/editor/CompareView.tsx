"use client";

import { useState, type ReactNode } from "react";
import type { Layout } from "@/domain/document";
import { diffLayouts, type LayoutDiff } from "@/domain/layoutDiff";
import { checkLayout, countBySeverity } from "@/domain/warnings";
import { formatLength } from "@/lib/format";
import { activeLayout, currentLayout, useEditorStore } from "@/store/editorStore";
import { StaticPlan, type PlanArrow, type PlanItem } from "@/components/plan/StaticPlan";
import { Dropdown } from "./fields";

type Mode = "side" | "overlay";

function pickPair(layouts: Layout[], current: Layout, active: Layout): [string, string] {
  if (current.id !== active.id) return [current.id, active.id];
  const other = layouts.find((l) => l.id !== current.id) ?? current;
  return [current.id, other.id];
}

function sideItems(
  layout: Layout,
  changed: Set<string>,
  onlyHere: Set<string>,
  kind: "added" | "removed",
): PlanItem[] {
  return layout.items.map((item) => ({
    item,
    style: onlyHere.has(item.id) ? kind : changed.has(item.id) ? "highlight" : "normal",
  }));
}

function overlayItems(
  a: Layout,
  b: Layout,
  diff: LayoutDiff,
): { items: PlanItem[]; arrows: PlanArrow[] } {
  const moved = new Set(diff.moved.map((m) => m.id));
  const added = new Set(diff.added.map((i) => i.id));
  const items: PlanItem[] = [
    // A에서의 위치는 점선 유령으로
    ...diff.moved.map((m) => ({ item: m.from, style: "ghost" as const })),
    ...diff.removed.map((item) => ({ item, style: "removed" as const })),
    ...b.items.map((item) => ({
      item,
      style: added.has(item.id)
        ? ("added" as const)
        : moved.has(item.id)
          ? ("highlight" as const)
          : ("normal" as const),
    })),
  ];
  const arrows = diff.moved
    .filter((m) => m.distance > 150)
    .map((m) => ({ from: { x: m.from.x, y: m.from.y }, to: { x: m.to.x, y: m.to.y } }));
  return { items, arrows };
}

/** 두 배치안 비교: 나란히 보기 / 겹쳐 보기 + 바뀐 가구 목록 */
export function CompareView() {
  const doc = useEditorStore((s) => s.doc);
  const unit = doc.settings.displayUnit;
  const [initial] = useState(() => pickPair(doc.layouts, currentLayout(doc), activeLayout(doc)));
  const [aId, setA] = useState(initial[0]);
  const [bId, setB] = useState(initial[1]);
  const [mode, setMode] = useState<Mode>("overlay");
  const [focusId, setFocusId] = useState<string | null>(null);

  const a = doc.layouts.find((l) => l.id === aId) ?? doc.layouts[0];
  const b = doc.layouts.find((l) => l.id === bId) ?? doc.layouts[doc.layouts.length - 1];
  const diff = diffLayouts(a, b);
  const warnA = countBySeverity(checkLayout(doc, a.items));
  const warnB = countBySeverity(checkLayout(doc, b.items));
  const changed = new Set(diff.moved.map((m) => m.id));

  const edit = (layoutId: string) => {
    const s = useEditorStore.getState();
    s.switchLayout(layoutId);
    s.setMode("furniture");
    s.setView("2d");
  };

  const layoutOptions = doc.layouts.map((l) => ({
    value: l.id,
    label: l.isCurrent ? `${l.name} (현재)` : l.name,
  }));
  const select = (value: string, onChange: (id: string) => void, label: string) => (
    <Dropdown value={value} onChange={onChange} options={layoutOptions} ariaLabel={label} />
  );

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-white">
      <div className="flex flex-wrap items-center gap-2 border-b border-neutral-200 px-4 py-2 text-sm">
        <span className="rounded bg-neutral-200 px-1.5 text-xs font-bold text-neutral-600">A</span>
        {select(a.id, setA, "비교 기준 배치안")}
        <button
          type="button"
          onClick={() => {
            setA(b.id);
            setB(a.id);
          }}
          title="A와 B 바꾸기"
          className="rounded-md px-2 py-1 text-neutral-500 hover:bg-neutral-100"
        >
          ⇄
        </button>
        <span className="rounded bg-blue-100 px-1.5 text-xs font-bold text-blue-700">B</span>
        {select(b.id, setB, "비교할 배치안")}

        <div className="ml-auto flex rounded-lg bg-neutral-100 p-0.5">
          {(
            [
              ["overlay", "겹쳐 보기"],
              ["side", "나란히 보기"],
            ] as const
          ).map(([value, text]) => (
            <button
              key={value}
              type="button"
              aria-pressed={mode === value}
              onClick={() => setMode(value)}
              className={`rounded-md px-3 py-1 font-medium ${mode === value ? "bg-white shadow-sm" : "text-neutral-500"}`}
            >
              {text}
            </button>
          ))}
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 bg-stone-50">
          {mode === "side" ? (
            <>
              <PlanPane label="A" name={a.name} onEdit={() => edit(a.id)}>
                <StaticPlan
                  doc={doc}
                  items={sideItems(a, changed, new Set(diff.removed.map((i) => i.id)), "removed")}
                  focusId={focusId}
                  className="h-full w-full"
                  title={`${a.name} 평면도`}
                />
              </PlanPane>
              <div className="w-px bg-neutral-200" />
              <PlanPane label="B" name={b.name} onEdit={() => edit(b.id)}>
                <StaticPlan
                  doc={doc}
                  items={sideItems(b, changed, new Set(diff.added.map((i) => i.id)), "added")}
                  focusId={focusId}
                  className="h-full w-full"
                  title={`${b.name} 평면도`}
                />
              </PlanPane>
            </>
          ) : (
            <PlanPane label="A → B" name={`${a.name} → ${b.name}`} onEdit={() => edit(b.id)}>
              <StaticPlan
                doc={doc}
                {...overlayItems(a, b, diff)}
                focusId={focusId}
                className="h-full w-full"
                title={`${a.name}에서 ${b.name}로 바뀐 평면도`}
              />
            </PlanPane>
          )}
        </div>

        <aside className="flex w-72 shrink-0 flex-col overflow-y-auto border-l border-neutral-200 text-sm">
          <section className="border-b border-neutral-200 px-4 py-3">
            <h2 className="text-xs font-semibold text-neutral-500">달라진 점</h2>
            <p className="mt-1 text-neutral-700">
              옮김 {diff.moved.length} · 추가 {diff.added.length} · 빠짐 {diff.removed.length} ·
              그대로 {diff.unchanged.length}
            </p>
            {mode === "overlay" && (
              <ul className="mt-2 flex flex-col gap-1 text-xs text-neutral-500">
                <Legend swatch="border-2 border-dashed border-neutral-500">A의 자리</Legend>
                <Legend swatch="border-2 border-blue-600 bg-blue-100">B로 옮긴 가구</Legend>
                <Legend swatch="border-2 border-green-600 bg-green-100">B에 추가</Legend>
                <Legend swatch="border-2 border-dashed border-red-600">B에서 빠짐</Legend>
              </ul>
            )}
          </section>
          <section className="border-b border-neutral-200 px-4 py-3">
            <h2 className="text-xs font-semibold text-neutral-500">확인할 점</h2>
            <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
              {(
                [
                  ["A", a.name, warnA],
                  ["B", b.name, warnB],
                ] as const
              ).map(([tag, name, w]) => (
                <div key={tag} className="contents">
                  <dt className="truncate text-neutral-700">
                    <span className="mr-1 text-xs font-bold text-neutral-500">{tag}</span>
                    {name}
                  </dt>
                  <dd className="text-right text-xs">
                    {w.error + w.warning === 0 ? (
                      <span className="text-emerald-700">문제없음</span>
                    ) : (
                      <>
                        <span className="text-red-600">문제 {w.error}</span> ·{" "}
                        <span className="text-orange-600">주의 {w.warning}</span>
                      </>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
          <ChangeList diff={diff} unit={unit} onFocus={setFocusId} />
        </aside>
      </div>
    </div>
  );
}

function PlanPane({
  label,
  name,
  onEdit,
  children,
}: {
  label: string;
  name: string;
  onEdit: () => void;
  children: ReactNode;
}) {
  return (
    <div className="relative flex min-w-0 flex-1 flex-col">
      <div className="absolute top-2 left-2 z-10 flex items-center gap-2 rounded-lg bg-white/95 px-2 py-1 text-sm shadow-sm ring-1 ring-neutral-200">
        <span className="text-xs font-bold text-neutral-500">{label}</span>
        <span className="font-medium">{name}</span>
        <button type="button" onClick={onEdit} className="text-xs text-blue-600 hover:underline">
          편집
        </button>
      </div>
      <div className="min-h-0 flex-1 p-4">{children}</div>
    </div>
  );
}

function Legend({ swatch, children }: { swatch: string; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      <span className={`inline-block h-3 w-4 rounded-sm ${swatch}`} />
      {children}
    </li>
  );
}

function ChangeList({
  diff,
  unit,
  onFocus,
}: {
  diff: LayoutDiff;
  unit: "cm" | "mm" | "m";
  onFocus: (id: string | null) => void;
}) {
  const rows = [
    ...diff.moved.map((m) => ({
      id: m.id,
      name: m.name,
      detail: [
        m.distance > 20 ? `${formatLength(Math.round(m.distance), unit)} 이동` : null,
        m.rotated
          ? `${Math.round(Math.abs(((m.to.rotation - m.from.rotation + 540) % 360) - 180))}° 회전`
          : null,
        m.resized ? "크기 바뀜" : null,
      ]
        .filter(Boolean)
        .join(" · "),
      tone: "text-blue-700",
    })),
    ...diff.added.map((i) => ({
      id: i.id,
      name: i.name,
      detail: "B에 추가",
      tone: "text-green-700",
    })),
    ...diff.removed.map((i) => ({
      id: i.id,
      name: i.name,
      detail: "B에서 빠짐",
      tone: "text-red-700",
    })),
  ];
  if (rows.length === 0) {
    return <p className="px-4 py-3 text-neutral-500">두 배치안의 가구 배치가 같아요.</p>;
  }
  return (
    <ul className="px-2 py-2">
      {rows.map((r) => (
        <li
          key={r.id}
          onMouseEnter={() => onFocus(r.id)}
          onMouseLeave={() => onFocus(null)}
          className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-amber-50"
        >
          <span className="truncate text-neutral-800">{r.name}</span>
          <span className={`shrink-0 text-xs ${r.tone}`}>{r.detail}</span>
        </li>
      ))}
    </ul>
  );
}
