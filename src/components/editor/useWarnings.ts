"use client";

import { useMemo } from "react";
import { checkLayout, type Warning } from "@/domain/warnings";
import { activeLayout, useEditorStore } from "@/store/editorStore";

/** 지금 편집 중인 배치안의 경고 (구조·설정·가구가 바뀔 때만 다시 계산) */
export function useWarnings(): Warning[] {
  const floorplan = useEditorStore((s) => s.doc.floorplan);
  const settings = useEditorStore((s) => s.doc.settings);
  const items = useEditorStore((s) => activeLayout(s.doc).items);
  return useMemo(() => checkLayout({ floorplan, settings }, items), [floorplan, settings, items]);
}
