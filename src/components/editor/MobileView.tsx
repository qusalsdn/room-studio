"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import { StaticPlan } from "@/components/plan/StaticPlan";
import { countBySeverity } from "@/domain/warnings";
import { activeLayout, useEditorStore } from "@/store/editorStore";
import { AccountStatus } from "./AccountStatus";
import { useWarnings } from "./useWarnings";

const Scene3D = dynamic(() => import("@/components/canvas3d/Scene3D"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-neutral-500">
      3D 보기를 불러오는 중…
    </div>
  ),
});

/** 휴대폰 화면: 편집 대신 평면도·3D 보기와 배치안 전환 */
export function MobileView() {
  const doc = useEditorStore((s) => s.doc);
  const [view, setView] = useState<"2d" | "3d">("2d");
  const layout = activeLayout(doc);
  const w = countBySeverity(useWarnings());

  return (
    <div className="flex h-dvh flex-col bg-white text-neutral-900">
      <header className="flex items-center gap-2 border-b border-neutral-200 px-4 py-2.5">
        <Link href="/" className="text-sm font-semibold">
          Room Studio
        </Link>
        <span className="text-neutral-300">/</span>
        <span className="min-w-0 flex-1 truncate text-sm">{doc.name}</span>
        <AccountStatus />
      </header>

      <p className="bg-amber-50 px-4 py-2 text-xs leading-relaxed text-amber-900">
        휴대폰에서는 보기만 할 수 있어요. 방을 그리고 가구를 옮기려면 컴퓨터에서 열어 주세요.
      </p>

      <div className="flex items-center gap-2 border-b border-neutral-200 px-4 py-2">
        <div className="flex rounded-lg bg-neutral-100 p-0.5 text-sm">
          {(
            [
              ["2d", "평면도"],
              ["3d", "3D"],
            ] as const
          ).map(([value, text]) => (
            <button
              key={value}
              type="button"
              aria-pressed={view === value}
              onClick={() => setView(value)}
              className={`rounded-md px-3 py-1 font-medium ${view === value ? "bg-white shadow-sm" : "text-neutral-500"}`}
            >
              {text}
            </button>
          ))}
        </div>
        {w.error + w.warning > 0 && (
          <span className="ml-auto text-xs">
            <span className="text-red-600">문제 {w.error}</span> ·{" "}
            <span className="text-orange-600">주의 {w.warning}</span>
          </span>
        )}
      </div>

      {doc.layouts.length > 1 && (
        <nav aria-label="배치안" className="flex gap-1 overflow-x-auto px-4 py-2 text-sm">
          {doc.layouts.map((l) => (
            <button
              key={l.id}
              type="button"
              aria-current={l.id === layout.id ? "page" : undefined}
              onClick={() => useEditorStore.getState().switchLayout(l.id)}
              className={`shrink-0 rounded-full px-3 py-1 ${l.id === layout.id ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-700"}`}
            >
              {l.name}
            </button>
          ))}
        </nav>
      )}

      <main className="min-h-0 flex-1 bg-stone-50">
        {doc.floorplan.rooms.length === 0 ? (
          <p className="p-6 text-sm text-neutral-500">아직 그린 방이 없어요.</p>
        ) : view === "2d" ? (
          <div className="h-full p-3">
            <StaticPlan
              doc={doc}
              items={layout.items.map((item) => ({ item, style: "normal" }))}
              showDimensions
              className="h-full w-full"
              title={`${layout.name} 평면도`}
            />
          </div>
        ) : (
          <Scene3D />
        )}
      </main>
    </div>
  );
}
