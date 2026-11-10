"use client";

import dynamic from "next/dynamic";
import { CompareView } from "./CompareView";
import { HelpDialogs } from "./HelpDialogs";
import { Inspector } from "./Inspector";
import { LayoutTabs } from "./LayoutTabs";
import { Sidebar } from "./Sidebar";
import { Toolbar } from "./Toolbar";
import { useShortcuts } from "./useShortcuts";
import { useEditorStore } from "@/store/editorStore";

// Konva는 브라우저 전용
const FloorplanCanvas = dynamic(() => import("@/components/canvas2d/FloorplanCanvas"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-stone-50" />,
});

// three.js는 3D 보기를 처음 열 때만 불러온다
const Scene3D = dynamic(() => import("@/components/canvas3d/Scene3D"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-stone-100 text-sm text-neutral-500">
      3D 보기를 불러오는 중…
    </div>
  ),
});

export function Editor() {
  useShortcuts();
  const view = useEditorStore((s) => s.view);
  return (
    <div className="flex h-dvh flex-col bg-white text-neutral-900">
      <HelpDialogs />
      <Toolbar />
      <LayoutTabs />
      {view === "compare" ? (
        <CompareView />
      ) : (
        <div className="flex min-h-0 flex-1">
          <Sidebar />
          <main className="flex min-w-0 flex-1">
            {view !== "3d" && (
              <div className="min-w-0 flex-1">
                <FloorplanCanvas />
              </div>
            )}
            {view === "split" && <div className="w-px bg-neutral-200" />}
            {view !== "2d" && (
              <div className="min-w-0 flex-1">
                <Scene3D />
              </div>
            )}
          </main>
          <Inspector />
        </div>
      )}
    </div>
  );
}
