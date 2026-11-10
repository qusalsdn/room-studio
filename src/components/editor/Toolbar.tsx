"use client";

import Link from "next/link";
import { useEditorStore } from "@/store/editorStore";
import { AccountStatus } from "./AccountStatus";
import { ExportMenu } from "./ExportMenu";
import { ShareButton } from "./ShareDialog";
import { Button } from "./fields";

export function Toolbar() {
  const name = useEditorStore((s) => s.doc.name);
  const canUndo = useEditorStore((s) => s.past.length > 0);
  const canRedo = useEditorStore((s) => s.future.length > 0);
  const scale = useEditorStore((s) => s.viewport.scale);
  const mode = useEditorStore((s) => s.mode);
  const view = useEditorStore((s) => s.view);
  const s = useEditorStore.getState;

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-neutral-200 bg-white px-4">
      <Link href="/" className="text-sm font-semibold text-neutral-900">
        Room Studio
      </Link>
      <span className="text-neutral-300">/</span>
      <span className="truncate text-sm text-neutral-700">{name}</span>

      <div
        role="tablist"
        aria-label="편집 모드"
        className="ml-4 flex rounded-lg bg-neutral-100 p-0.5 text-sm"
      >
        {(
          [
            ["structure", "구조", "1"],
            ["furniture", "가구 배치", "2"],
          ] as const
        ).map(([value, text, key]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={mode === value}
            title={`${text} 모드 (${key})`}
            onClick={() => s().setMode(value)}
            className={`rounded-md px-3 py-1 font-medium transition-colors ${
              mode === value
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-500 hover:text-neutral-800"
            }`}
          >
            {text}
          </button>
        ))}
      </div>

      <div
        role="group"
        aria-label="보기"
        className="ml-3 flex rounded-lg border border-neutral-200 p-0.5 text-sm"
      >
        {(
          [
            ["2d", "2D"],
            ["3d", "3D"],
            ["split", "나란히"],
          ] as const
        ).map(([value, text]) => (
          <button
            key={value}
            type="button"
            aria-pressed={view === value}
            onClick={() => s().setView(value)}
            className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
              view === value
                ? "bg-neutral-900 text-white"
                : "text-neutral-500 hover:text-neutral-800"
            }`}
          >
            {text}
          </button>
        ))}
      </div>

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
        <Button variant="ghost" onClick={() => s().setHelp("guide")} title="사용 안내 (단축키는 ?)">
          도움말
        </Button>
        <ExportMenu />
        <ShareButton />
        <span className="mx-1 h-5 w-px bg-neutral-200" />
        <Button variant="ghost" onClick={() => s().requestFit()} title="화면 맞춤 (F)">
          화면 맞춤
        </Button>
        <span className="w-14 text-right text-xs text-neutral-500 tabular-nums">
          {/* 기본 배율 0.1px/mm(1px=1cm)을 100%로 */}
          {Math.round(scale * 1000)}%
        </span>
      </div>
      <AccountStatus />
    </header>
  );
}
