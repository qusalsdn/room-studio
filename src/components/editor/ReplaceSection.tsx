"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CATEGORY_LABELS,
  FURNITURE_CATALOG,
  findCatalogItem,
  symbolOf,
  type CatalogItem,
} from "@/catalog/furniture";
import type { FurnitureItem } from "@/domain/document";
import type { ReplaceSpec } from "@/domain/replaceItem";
import { formatLength } from "@/lib/format";
import { activeReplaceNotice, findItem, useEditorStore } from "@/store/editorStore";
import { Button, LengthField, Section, Segmented } from "./fields";
import { Thumb } from "./FurniturePanel";

/** 속성 패널의 "가구 교체": 버튼과 방금 한 교체의 결과 안내 */
export function ReplaceSection({ item }: { item: FurnitureItem }) {
  const [open, setOpen] = useState(false);
  const notice = useEditorStore(activeReplaceNotice);
  const doc = useEditorStore((s) => s.doc);
  const s = useEditorStore.getState;
  const shown = notice?.itemId === item.id ? notice : null;

  return (
    <Section title="가구 교체">
      <div className="flex flex-col gap-1.5 text-sm">
        {shown && (
          <div
            className={`rounded-md px-3 py-2 text-xs leading-relaxed ${
              shown.fits ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"
            }`}
          >
            {shown.fits ? (
              <p>&lsquo;{shown.fromName}&rsquo;에서 바꿨어요. 실행 취소(⌘Z)로 되돌릴 수 있어요.</p>
            ) : (
              <>
                <p>그 자리에는 잘 맞지 않아요: {shown.problems.join(", ")}</p>
                <p className="mt-1">아래 자리 추천에서 옮길 곳을 골라 보세요.</p>
              </>
            )}
            {shown.related.length > 0 && (
              <div className="mt-1.5 flex flex-wrap items-center gap-1">
                <span>자리가 어색해진 가구:</span>
                {shown.related.map((id) => {
                  const other = findItem(doc, id);
                  if (!other) return null;
                  return (
                    <button
                      key={id}
                      type="button"
                      title={`${other.name}을(를) 고르고 자리를 추천받아요`}
                      onClick={() => {
                        s().select({ kind: "furniture", itemId: id });
                        s().suggestFor(id);
                      }}
                      className="rounded bg-white px-1.5 py-0.5 font-medium text-blue-700 ring-1 ring-current/30 hover:bg-blue-50"
                    >
                      {other.name} 자리 추천
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
        <Button onClick={() => setOpen(true)}>다른 가구로 교체</Button>
      </div>
      {open && <ReplaceDialog item={item} onClose={() => setOpen(false)} />}
    </Section>
  );
}

type Mode = "catalog" | "custom";

function sizeText(w: number, d: number, unit: "cm" | "mm" | "m") {
  return `${formatLength(w, unit)} × ${formatLength(d, unit)}`;
}

function ReplaceDialog({ item, onClose }: { item: FurnitureItem; onClose: () => void }) {
  const unit = useEditorStore((s) => s.doc.settings.displayUnit);
  const current = findCatalogItem(item.catalogId);
  const [mode, setMode] = useState<Mode>("catalog");
  const [query, setQuery] = useState("");
  const [pick, setPick] = useState<CatalogItem | null>(null);
  const [custom, setCustom] = useState({
    name: item.name,
    width: item.width,
    depth: item.depth,
    height: item.height,
  });
  const [newLayout, setNewLayout] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // 같은 분류를 먼저, 그다음 나머지 분류 순서대로
  const groups = useMemo(() => {
    const q = query.trim();
    const list = FURNITURE_CATALOG.filter(
      (c) => !c.hidden && c.id !== item.catalogId && (!q || c.name.includes(q)),
    );
    const sameCat = current?.category;
    const cats = Object.keys(CATEGORY_LABELS) as CatalogItem["category"][];
    const ordered = sameCat ? [sameCat, ...cats.filter((c) => c !== sameCat)] : cats;
    return ordered
      .map((cat) => ({
        title: cat === sameCat ? `같은 분류 · ${CATEGORY_LABELS[cat]}` : CATEGORY_LABELS[cat],
        items: list.filter((c) => c.category === cat),
      }))
      .filter((g) => g.items.length > 0);
  }, [query, item.catalogId, current?.category]);

  const spec: ReplaceSpec | null =
    mode === "catalog"
      ? pick && {
          catalogId: pick.id,
          name: pick.name,
          width: pick.width,
          depth: pick.depth,
          height: pick.height,
          color: pick.color,
        }
      : custom.name.trim()
        ? {
            catalogId: "custom",
            name: custom.name.trim(),
            width: custom.width,
            depth: custom.depth,
            height: custom.height,
            color: item.color,
          }
        : null;

  const confirm = () => {
    if (!spec) return;
    useEditorStore.getState().replaceFurniture(item.id, spec, { newLayout });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-4"
      onPointerDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="replace-title"
        className="flex max-h-[85dvh] w-full max-w-md flex-col rounded-2xl bg-white p-6 shadow-xl ring-1 ring-neutral-200"
      >
        <h2 id="replace-title" className="text-lg font-semibold">
          &lsquo;{item.name}&rsquo; 교체
        </h2>
        <p className="mt-1 text-xs text-neutral-500">
          지금 {sizeText(item.width, item.depth, unit)}. 벽·옆 가구에 붙어 있던 면은 그대로 두고
          바꿔요.
        </p>

        <div className="mt-3">
          <Segmented<Mode>
            ariaLabel="교체할 가구 고르는 방법"
            value={mode}
            onChange={setMode}
            options={[
              { value: "catalog", label: "목록에서 고르기" },
              { value: "custom", label: "직접 입력" },
            ]}
          />
        </div>

        {mode === "catalog" ? (
          <div className="mt-3 flex min-h-0 flex-col gap-2">
            <input
              type="search"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="가구 이름 검색"
              aria-label="교체할 가구 검색"
              className="w-full rounded-md border border-neutral-300 px-2 py-1 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
            <div className="min-h-0 overflow-y-auto rounded-md border border-neutral-200">
              {groups.length === 0 && (
                <p className="p-3 text-sm text-neutral-500">찾는 가구가 없어요.</p>
              )}
              {groups.map((g) => (
                <div key={g.title}>
                  <p className="sticky top-0 bg-neutral-50 px-2 py-1 text-xs font-semibold text-neutral-500">
                    {g.title}
                  </p>
                  <ul>
                    {g.items.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          aria-pressed={pick?.id === c.id}
                          onClick={() => setPick(c)}
                          onDoubleClick={() => {
                            setPick(c);
                            useEditorStore.getState().replaceFurniture(
                              item.id,
                              {
                                catalogId: c.id,
                                name: c.name,
                                width: c.width,
                                depth: c.depth,
                                height: c.height,
                                color: c.color,
                              },
                              { newLayout },
                            );
                            onClose();
                          }}
                          className={`flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm ${
                            pick?.id === c.id ? "bg-blue-50" : "hover:bg-neutral-50"
                          }`}
                        >
                          <Thumb item={c} />
                          <span className="flex-1">{c.name}</span>
                          <span className="text-xs text-neutral-500 tabular-nums">
                            {sizeText(c.width, c.depth, unit)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-neutral-600">
            <label className="col-span-2 flex flex-col gap-1">
              이름
              <input
                value={custom.name}
                onChange={(e) => setCustom({ ...custom, name: e.target.value })}
                aria-label="새 가구 이름"
                className="w-full rounded-md border border-neutral-300 px-2 py-1 text-sm outline-none focus:border-blue-500"
              />
            </label>
            {(
              [
                ["width", "가로", 50],
                ["depth", "깊이", 20],
                ["height", "높이", 5],
              ] as const
            ).map(([key, label, min]) => (
              <label key={key} className="flex flex-col gap-1">
                {label}
                <LengthField
                  valueMm={custom[key]}
                  unit={unit}
                  min={min}
                  ariaLabel={`새 가구 ${label}`}
                  onCommit={(mm) => setCustom((c) => ({ ...c, [key]: mm }))}
                />
              </label>
            ))}
          </div>
        )}

        {spec && (
          <p className="mt-3 rounded-md bg-neutral-50 px-3 py-2 text-xs text-neutral-700">
            <span className="inline-flex items-center gap-2">
              <Thumb
                item={{
                  width: spec.width,
                  depth: spec.depth,
                  color: spec.color,
                  symbol: symbolOf(spec.catalogId),
                }}
              />
              <span>
                <b>{spec.name}</b>
                <br />
                {sizeText(item.width, item.depth, unit)} → {sizeText(spec.width, spec.depth, unit)}
              </span>
            </span>
          </p>
        )}

        <label className="mt-3 flex items-center gap-2 text-sm text-neutral-700">
          <input
            type="checkbox"
            checked={newLayout}
            onChange={(e) => setNewLayout(e.target.checked)}
          />
          새 배치안에서 해 보기{" "}
          <span className="text-xs text-neutral-500">(지금 배치는 그대로)</span>
        </label>

        <div className="mt-5 flex items-center justify-end gap-2">
          <Button onClick={onClose}>취소</Button>
          <Button variant="primary" disabled={!spec} onClick={confirm}>
            교체하기
          </Button>
        </div>
      </div>
    </div>
  );
}
