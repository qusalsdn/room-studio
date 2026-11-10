"use client";

import { useState } from "react";
import {
  CATEGORY_LABELS,
  FURNITURE_CATALOG,
  FURNITURE_DRAG_TYPE,
  type CatalogItem,
  type FurnitureCategory,
} from "@/catalog/furniture";
import { formatLength } from "@/lib/format";
import { useEditorStore } from "@/store/editorStore";
import { Section } from "./fields";

/** 지금 화면 가운데의 도면 좌표 */
function viewCenter() {
  const s = useEditorStore.getState();
  const el = document.querySelector("[data-floorplan-canvas]");
  const r = el?.getBoundingClientRect();
  const cx = r ? r.width / 2 : 400;
  const cy = r ? r.height / 2 : 300;
  const { scale, x, y } = s.viewport;
  return { x: Math.round((cx - x) / scale / 10) * 10, y: Math.round((cy - y) / scale / 10) * 10 };
}

function Thumb({ item }: { item: CatalogItem }) {
  const max = Math.max(item.width, item.depth);
  const w = (item.width / max) * 28;
  const h = (item.depth / max) * 28;
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-neutral-50 ring-1 ring-neutral-200">
      <span
        className={item.symbol === "round" ? "rounded-full" : "rounded-[2px]"}
        style={{
          width: Math.max(w, 4),
          height: Math.max(h, 4),
          background: item.color,
          boxShadow: "inset 0 0 0 1px rgba(39,39,42,0.35)",
        }}
      />
    </span>
  );
}

export function FurniturePanel() {
  const unit = useEditorStore((s) => s.doc.settings.displayUnit);
  const [query, setQuery] = useState("");
  const q = query.trim();
  const filtered = q ? FURNITURE_CATALOG.filter((c) => c.name.includes(q)) : FURNITURE_CATALOG;
  const categories = Object.keys(CATEGORY_LABELS) as FurnitureCategory[];

  return (
    <>
      <Section title="가구 추가">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          placeholder="가구 검색"
          aria-label="가구 검색"
          className="w-full rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        />
        <p className="text-xs text-neutral-500">
          클릭하면 화면 가운데에, 끌어다 놓으면 그 자리에 놓여요. 치수는 놓은 뒤 오른쪽에서
          실측값으로 바꿀 수 있어요.
        </p>
      </Section>
      {categories.map((cat) => {
        const list = filtered.filter((c) => c.category === cat);
        if (list.length === 0) return null;
        return (
          <Section key={cat} title={CATEGORY_LABELS[cat]}>
            <ul className="flex flex-col">
              {list.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData(FURNITURE_DRAG_TYPE, item.id);
                      e.dataTransfer.effectAllowed = "copy";
                    }}
                    onClick={() => useEditorStore.getState().addFurniture(item.id, viewCenter())}
                    className="flex w-full cursor-grab items-center gap-3 rounded-md px-1.5 py-1 text-left hover:bg-neutral-100 active:cursor-grabbing"
                  >
                    <Thumb item={item} />
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-sm text-neutral-800">{item.name}</span>
                      <span className="text-xs text-neutral-500 tabular-nums">
                        {formatLength(item.width, unit)} × {formatLength(item.depth, unit)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Section>
        );
      })}
      <Section title="조작법">
        <ul className="flex flex-col gap-1 text-xs leading-relaxed text-neutral-600">
          <li>드래그: 이동 (벽·다른 가구에 자동으로 붙음)</li>
          <li>위쪽 동그라미 드래그: 회전 (15° 단위, Shift 자유)</li>
          <li>R / Shift+R: 90° 회전</li>
          <li>방향키: 1cm (Shift 10cm) 이동</li>
          <li>⌘D: 복제, Delete: 삭제</li>
          <li>Alt 누른 채 드래그: 붙기 끄기</li>
        </ul>
      </Section>
    </>
  );
}
