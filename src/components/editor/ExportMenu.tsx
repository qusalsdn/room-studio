"use client";

import { useEffect, useRef, useState } from "react";
import { export3dPng, exportPlanPng } from "@/lib/exportImage";
import { activeLayout, useEditorStore } from "@/store/editorStore";
import { Button } from "./fields";

/** 툴바 "이미지 저장" 메뉴: 평면도 PNG, 3D 화면 PNG */
export function ExportMenu() {
  const view = useEditorStore((s) => s.view);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const has3d = view === "3d" || view === "split";

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [open]);

  const run = async (fn: typeof exportPlanPng) => {
    setOpen(false);
    setBusy(true);
    try {
      const { doc } = useEditorStore.getState();
      await fn(doc, activeLayout(doc));
    } catch (e) {
      window.alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div ref={ref} className="relative">
      <Button variant="ghost" disabled={busy} onClick={() => setOpen((v) => !v)}>
        {busy ? "저장 중…" : "이미지 저장"}
      </Button>
      {open && (
        <div
          role="menu"
          className="absolute top-full right-0 z-50 mt-1 flex w-52 flex-col rounded-lg bg-white p-1 text-sm shadow-lg ring-1 ring-neutral-200"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => run(exportPlanPng)}
            className="rounded-md px-2.5 py-1.5 text-left hover:bg-neutral-100"
          >
            평면도 (PNG)
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={!has3d}
            title={has3d ? undefined : "3D나 나란히 보기에서 저장할 수 있어요"}
            onClick={() => run(export3dPng)}
            className="rounded-md px-2.5 py-1.5 text-left hover:bg-neutral-100 disabled:opacity-40 disabled:hover:bg-transparent"
          >
            지금 보이는 3D 화면 (PNG)
          </button>
        </div>
      )}
    </div>
  );
}
