"use client";

import dynamic from "next/dynamic";
import { Inspector } from "./Inspector";
import { Sidebar } from "./Sidebar";
import { Toolbar } from "./Toolbar";
import { useShortcuts } from "./useShortcuts";

// Konva는 브라우저 전용
const FloorplanCanvas = dynamic(() => import("@/components/canvas2d/FloorplanCanvas"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-stone-50" />,
});

export function Editor() {
  useShortcuts();
  return (
    <div className="flex h-dvh flex-col bg-white text-neutral-900">
      <Toolbar />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="min-w-0 flex-1">
          <FloorplanCanvas />
        </main>
        <Inspector />
      </div>
    </div>
  );
}
