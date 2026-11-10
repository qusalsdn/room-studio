"use client";

import Link from "next/link";
import { useEditorStore } from "@/store/editorStore";
import { Button } from "./fields";

export function Toolbar() {
  const name = useEditorStore((s) => s.doc.name);
  const canUndo = useEditorStore((s) => s.past.length > 0);
  const canRedo = useEditorStore((s) => s.future.length > 0);
  const scale = useEditorStore((s) => s.viewport.scale);
  const s = useEditorStore.getState;

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-neutral-200 bg-white px-4">
      <Link href="/" className="text-sm font-semibold text-neutral-900">
        Room Studio
      </Link>
      <span className="text-neutral-300">/</span>
      <span className="truncate text-sm text-neutral-700">{name}</span>
      <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] text-neutral-500">
        구조 편집
      </span>

      <div className="ml-auto flex items-center gap-1">
        <Button
          variant="ghost"
          onClick={() => s().undo()}
          disabled={!canUndo}
          title="실행 취소 (⌘Z)"
        >
          ↶ 실행 취소
        </Button>
        <Button
          variant="ghost"
          onClick={() => s().redo()}
          disabled={!canRedo}
          title="다시 실행 (⇧⌘Z)"
        >
          ↷ 다시 실행
        </Button>
        <span className="mx-1 h-5 w-px bg-neutral-200" />
        <Button variant="ghost" onClick={() => s().requestFit()} title="화면 맞춤 (F)">
          화면 맞춤
        </Button>
        <span className="w-14 text-right text-xs text-neutral-500 tabular-nums">
          {/* 기본 배율 0.1px/mm(1px=1cm)을 100%로 */}
          {Math.round(scale * 1000)}%
        </span>
      </div>
      <span className="text-xs text-neutral-400">브라우저에 자동 저장됨</span>
    </header>
  );
}
