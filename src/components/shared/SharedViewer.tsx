"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { StaticPlan } from "@/components/plan/StaticPlan";
import { exportPlanPng } from "@/lib/exportImage";
import type { SharedProject } from "@/lib/sharedProject";
import { activeLayout, currentLayout, useEditorStore } from "@/store/editorStore";

const Scene3D = dynamic(() => import("@/components/canvas3d/Scene3D"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-neutral-500">
      3D 보기를 불러오는 중…
    </div>
  ),
});

type View = "2d" | "3d";

/** 공유 링크로 보는 읽기 전용 화면 (/s/[token]) */
export function SharedViewer({ project, token }: { project: SharedProject; token: string }) {
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<View>("2d");
  const doc = useEditorStore((s) => s.doc);

  useEffect(() => {
    // 3D 화면이 같은 스토어를 읽으므로 공유 문서를 읽기 전용 id로 불러온다 (게스트 저장본은 건드리지 않음)
    const s = useEditorStore.getState();
    s.loadProject(`shared:${token}`, project.document);
    s.switchLayout(currentLayout(project.document).id);
    queueMicrotask(() => setReady(true));
  }, [project, token]);

  if (!ready) return null;
  const layout = activeLayout(doc);

  return (
    <div className="flex h-dvh flex-col bg-white text-neutral-900">
      <header className="flex flex-wrap items-center gap-3 border-b border-neutral-200 px-4 py-2">
        <Link href="/" className="text-sm font-semibold">
          Room Studio
        </Link>
        <span className="text-neutral-300">/</span>
        <h1 className="truncate text-sm font-medium">{project.name}</h1>
        <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] text-neutral-500">
          읽기 전용
        </span>
        <span className="text-xs text-neutral-500">
          {new Date(project.updatedAt).toLocaleString("ko-KR", {
            dateStyle: "medium",
            timeStyle: "short",
          })}{" "}
          저장
        </span>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex rounded-lg border border-neutral-200 p-0.5 text-sm">
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
                className={`rounded-md px-3 py-1 font-medium ${view === value ? "bg-neutral-900 text-white" : "text-neutral-500 hover:text-neutral-800"}`}
              >
                {text}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => exportPlanPng(doc, layout).catch((e: Error) => window.alert(e.message))}
            className="rounded-md px-2.5 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
          >
            평면도 이미지 저장
          </button>
        </div>
      </header>

      {doc.layouts.length > 1 && (
        <nav
          aria-label="배치안"
          className="flex gap-1 overflow-x-auto border-b border-neutral-200 bg-stone-50 px-4 py-1.5 text-sm"
        >
          {doc.layouts.map((l) => (
            <button
              key={l.id}
              type="button"
              aria-current={l.id === layout.id ? "page" : undefined}
              onClick={() => useEditorStore.getState().switchLayout(l.id)}
              className={`shrink-0 rounded-md px-2.5 py-1 ${l.id === layout.id ? "bg-white font-semibold shadow-sm ring-1 ring-neutral-200" : "text-neutral-600 hover:bg-white/70"}`}
            >
              {l.name}
              {l.isCurrent && (
                <span className="ml-1.5 rounded bg-emerald-100 px-1 text-[10px] font-semibold text-emerald-700">
                  현재
                </span>
              )}
            </button>
          ))}
        </nav>
      )}

      <main className="min-h-0 flex-1 bg-stone-50">
        {view === "2d" ? (
          <div className="h-full p-6">
            <StaticPlan
              doc={doc}
              items={layout.items.map((item) => ({ item, style: "normal" }))}
              showDimensions
              className="h-full w-full"
              title={`${project.name} ${layout.name} 평면도`}
            />
          </div>
        ) : (
          <Scene3D />
        )}
      </main>
    </div>
  );
}
