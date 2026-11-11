"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Layout } from "@/domain/document";
import { activeLayout, useEditorStore } from "@/store/editorStore";
import { AutoArrangeButton } from "./AutoArrangeDialog";

/** 편집기 위쪽 배치안 탭: 전환, 새 배치안, 이름 바꾸기, 현재 배치 지정, 삭제, 자동 배치, 비교 */
export function LayoutTabs() {
  const layouts = useEditorStore((s) => s.doc.layouts);
  const activeId = useEditorStore((s) => activeLayout(s.doc).id);
  const view = useEditorStore((s) => s.view);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const s = useEditorStore.getState;

  return (
    <div className="flex h-10 shrink-0 items-center gap-1 overflow-x-auto border-b border-neutral-200 bg-stone-50 px-3 text-sm">
      <span className="mr-1 shrink-0 text-xs font-semibold text-neutral-500">배치안</span>
      {layouts.map((l) => (
        <Tab
          key={l.id}
          layout={l}
          active={l.id === activeId && view !== "compare"}
          renaming={renaming === l.id}
          menuOpen={menuFor === l.id}
          canDelete={layouts.length > 1}
          onSelect={() => {
            s().switchLayout(l.id);
            if (s().view === "compare") s().setView("2d");
          }}
          onStartRename={() => {
            setMenuFor(null);
            setRenaming(l.id);
          }}
          onRename={(name) => {
            if (name && name !== l.name) s().renameLayout(l.id, name);
            setRenaming(null);
          }}
          onToggleMenu={() => setMenuFor((m) => (m === l.id ? null : l.id))}
          onOpenMenu={() => setMenuFor(l.id)}
          onCloseMenu={() => setMenuFor(null)}
        />
      ))}
      <button
        type="button"
        onClick={() => {
          s().addLayout();
          if (s().view === "compare") s().setView("2d");
        }}
        title="지금 보고 있는 배치안을 복제해서 새 배치안을 만들어요"
        className="shrink-0 rounded-md px-2 py-1 text-neutral-600 hover:bg-white hover:text-neutral-900"
      >
        ＋ 새 배치안
      </button>
      <span className="flex-1" />
      {view !== "compare" && <AutoArrangeButton />}
      <button
        type="button"
        disabled={layouts.length < 2}
        onClick={() => s().setView(view === "compare" ? "2d" : "compare")}
        title={layouts.length < 2 ? "배치안이 2개 이상일 때 비교할 수 있어요" : "두 배치안 비교"}
        className={`shrink-0 rounded-md px-2.5 py-1 font-medium disabled:opacity-40 ${
          view === "compare"
            ? "bg-neutral-900 text-white"
            : "text-neutral-700 ring-1 ring-neutral-300 hover:bg-white"
        }`}
      >
        {view === "compare" ? "비교 닫기" : "비교하기"}
      </button>
    </div>
  );
}

function Tab({
  layout,
  active,
  renaming,
  menuOpen,
  canDelete,
  onSelect,
  onStartRename,
  onRename,
  onToggleMenu,
  onOpenMenu,
  onCloseMenu,
}: {
  layout: Layout;
  active: boolean;
  renaming: boolean;
  menuOpen: boolean;
  canDelete: boolean;
  onSelect: () => void;
  onStartRename: () => void;
  onRename: (name: string) => void;
  onToggleMenu: () => void;
  onOpenMenu: () => void;
  onCloseMenu: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  // 탭 줄은 가로 스크롤 영역이라 그 안에 absolute로 띄우면 잘린다. 화면 기준(fixed)으로 띄운다
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const s = useEditorStore.getState;

  const openAtTab = () => {
    const r = menuRef.current?.getBoundingClientRect();
    if (r) setMenuPos({ x: r.left, y: r.bottom + 4 });
  };

  const confirmDelete = () => {
    onCloseMenu();
    if (window.confirm(`'${layout.name}'을(를) 지울까요? 실행 취소(⌘Z)로 되돌릴 수 있어요.`)) {
      s().deleteLayout(layout.id);
    }
  };

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) onCloseMenu();
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("resize", onCloseMenu);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("resize", onCloseMenu);
    };
  }, [menuOpen, onCloseMenu]);

  return (
    <div
      ref={menuRef}
      // 마우스 오른쪽 클릭으로도 메뉴를 연다
      onContextMenu={(e) => {
        e.preventDefault();
        setMenuPos({ x: e.clientX, y: e.clientY });
        onOpenMenu();
      }}
      className={`group relative flex shrink-0 items-center rounded-md ${
        active ? "bg-white shadow-sm ring-1 ring-neutral-200" : "hover:bg-white/70"
      }`}
    >
      {renaming ? (
        <input
          autoFocus
          defaultValue={layout.name}
          aria-label="배치안 이름"
          className="w-32 rounded-md border border-blue-500 px-2 py-0.5 text-sm outline-none"
          onBlur={(e) => onRename(e.currentTarget.value.trim())}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") onRename("");
          }}
        />
      ) : (
        <button
          type="button"
          onClick={onSelect}
          onDoubleClick={onStartRename}
          aria-current={active ? "page" : undefined}
          title="더블클릭해서 이름 바꾸기"
          className={`flex items-center gap-1.5 py-1 pr-1 pl-2.5 ${active ? "font-semibold text-neutral-900" : "text-neutral-600"}`}
        >
          {layout.name}
          {layout.isCurrent && (
            <span className="rounded bg-emerald-100 px-1 text-[10px] font-semibold text-emerald-700">
              현재
            </span>
          )}
        </button>
      )}
      <button
        type="button"
        aria-label={`${layout.name} 메뉴`}
        aria-expanded={menuOpen}
        onClick={() => {
          openAtTab();
          onToggleMenu();
        }}
        title="메뉴 (오른쪽 클릭으로도 열려요)"
        className="rounded px-1.5 py-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
      >
        ⋯
      </button>
      {canDelete && !renaming && (
        <button
          type="button"
          aria-label={`${layout.name} 삭제`}
          title="배치안 삭제"
          onClick={confirmDelete}
          className="mr-0.5 rounded px-1 py-0.5 text-neutral-500 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 focus-visible:opacity-100"
        >
          ×
        </button>
      )}
      {menuOpen && (
        <div
          role="menu"
          style={{ left: menuPos.x, top: menuPos.y }}
          className="fixed z-50 flex w-44 flex-col rounded-lg bg-white p-1 text-sm shadow-lg ring-1 ring-neutral-200"
        >
          <MenuItem onClick={onStartRename}>이름 바꾸기</MenuItem>
          <MenuItem
            onClick={() => {
              onCloseMenu();
              s().addLayout(layout.id);
              if (s().view === "compare") s().setView("2d");
            }}
          >
            복제해서 새 배치안
          </MenuItem>
          <MenuItem
            disabled={layout.isCurrent}
            onClick={() => {
              onCloseMenu();
              s().setCurrentLayout(layout.id);
            }}
          >
            현재 배치로 지정
          </MenuItem>
          <MenuItem danger disabled={!canDelete} onClick={confirmDelete}>
            {canDelete ? "삭제" : "삭제 (하나뿐이라 불가)"}
          </MenuItem>
        </div>
      )}
    </div>
  );
}

function MenuItem({
  children,
  onClick,
  disabled,
  danger,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-md px-2.5 py-1.5 text-left hover:bg-neutral-100 disabled:opacity-40 disabled:hover:bg-transparent ${danger ? "text-red-600" : "text-neutral-800"}`}
    >
      {children}
    </button>
  );
}
