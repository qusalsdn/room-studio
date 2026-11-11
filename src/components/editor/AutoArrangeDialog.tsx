"use client";

import { useEffect, useMemo, useState } from "react";
import { placementOf, roomOf } from "@/domain/autoArrange";
import { checkLayout } from "@/domain/warnings";
import { runAutoArrange } from "@/lib/runAutoArrange";
import { activeLayout, selectedRoomId, useEditorStore } from "@/store/editorStore";
import { Button, Dropdown, Segmented } from "./fields";

type Scope = "house" | "room";
type Done = { layoutName: string; unplaced: string[]; before: number; after: number };

/** 배치안 탭의 "자동 배치" 버튼과 대화상자 */
export function AutoArrangeButton() {
  const [open, setOpen] = useState(false);
  const hasItems = useEditorStore((s) => activeLayout(s.doc).items.length > 0);
  const hasRooms = useEditorStore((s) => s.doc.floorplan.rooms.length > 0);
  const ready = hasItems && hasRooms;

  return (
    <>
      <button
        type="button"
        disabled={!ready}
        onClick={() => setOpen(true)}
        title={
          ready
            ? "가구를 겹치지 않고 쓰기 편하게 다시 놓아 새 배치안으로 만들어요"
            : "방과 가구가 있어야 자동 배치할 수 있어요"
        }
        className="shrink-0 rounded-md px-2.5 py-1 font-medium text-neutral-700 ring-1 ring-neutral-300 hover:bg-white disabled:opacity-40"
      >
        자동 배치
      </button>
      {open && <AutoArrangeDialog onClose={() => setOpen(false)} />}
    </>
  );
}

function AutoArrangeDialog({ onClose }: { onClose: () => void }) {
  const doc = useEditorStore((s) => s.doc);
  const selection = useEditorStore((s) => s.selection);
  const rooms = doc.floorplan.rooms;
  const layout = activeLayout(doc);

  // 방을 고른 상태로 열면 그 방부터 제안한다
  const selectedItem =
    selection?.kind === "furniture" ? layout.items.find((i) => i.id === selection.itemId) : null;
  const initialRoom =
    selectedRoomId(selection) ?? (selectedItem && roomOf(selectedItem, rooms)?.id) ?? rooms[0]?.id;
  const [scope, setScope] = useState<Scope>("house");
  const [roomId, setRoomId] = useState(initialRoom ?? "");
  const [fixed, setFixed] = useState<Set<string>>(new Set());
  const [done, setDone] = useState<Done | null>(null);
  const [busy, setBusy] = useState(false);
  // 배치하는 동안에는 닫지 않는다 (결과가 닫힌 뒤에 배치안으로 생기면 헷갈린다)
  const close = () => !busy && onClose();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, busy]);

  const movable = useMemo(
    () =>
      layout.items
        .filter((i) => placementOf(i) !== "keep")
        .map((i) => ({ item: i, room: roomOf(i, rooms) }))
        .filter(({ room }) => scope === "house" || room?.id === roomId),
    [layout.items, rooms, scope, roomId],
  );

  const toggle = (id: string) =>
    setFixed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const run = async () => {
    setBusy(true);
    const before = checkLayout(doc, layout.items).length;
    const { items, unplaced } = await runAutoArrange(doc, layout.items, {
      fixedIds: [...fixed],
      roomIds: scope === "room" ? [roomId] : undefined,
    });
    const s = useEditorStore.getState();
    s.addArrangedLayout(items);
    const result = activeLayout(useEditorStore.getState().doc);
    setBusy(false);
    setDone({
      layoutName: result.name,
      unplaced: unplaced.map((id) => items.find((i) => i.id === id)?.name ?? id),
      before,
      after: checkLayout(doc, items).length,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-4"
      onPointerDown={(e) => e.target === e.currentTarget && close()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auto-arrange-title"
        className="flex max-h-[85dvh] w-full max-w-md flex-col rounded-2xl bg-white p-6 shadow-xl ring-1 ring-neutral-200"
      >
        <h2 id="auto-arrange-title" className="text-lg font-semibold">
          자동 배치
        </h2>

        {done ? (
          <div className="mt-3 space-y-2 text-sm leading-relaxed text-neutral-700">
            <p>
              <b>&lsquo;{done.layoutName}&rsquo;</b> 배치안을 만들었어요. 원래 배치안&lsquo;
              {layout.name}&rsquo;은 그대로 있어요.
            </p>
            <p>
              확인할 점: {done.before}개 → <b>{done.after}개</b>
            </p>
            {done.unplaced.length > 0 && (
              <p className="rounded-md bg-amber-50 px-3 py-2 text-amber-800">
                자리를 못 찾아 그대로 둔 가구: {done.unplaced.join(", ")}
              </p>
            )}
            <p className="text-neutral-500">마음에 들지 않으면 실행 취소(⌘Z)로 되돌릴 수 있어요.</p>
          </div>
        ) : (
          <div className="mt-3 flex min-h-0 flex-col gap-4 text-sm text-neutral-700">
            <p className="leading-relaxed">
              가구가 겹치거나 문·통로를 막지 않게, 소파는 TV를 마주 보고 의자는 책상 앞에 오도록
              다시 놓아요. 가구는 지금 있는 방 안에서만 옮기고, 결과는 <b>새 배치안</b>으로
              만들어요.
            </p>

            {rooms.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="w-14 shrink-0 font-medium">범위</span>
                <Segmented<Scope>
                  ariaLabel="자동 배치 범위"
                  value={scope}
                  onChange={setScope}
                  options={[
                    { value: "house", label: "집 전체" },
                    { value: "room", label: "방 하나" },
                  ]}
                />
                {scope === "room" && (
                  <Dropdown
                    ariaLabel="자동 배치할 방"
                    value={roomId}
                    onChange={setRoomId}
                    options={rooms.map((r) => ({ value: r.id, label: r.name }))}
                  />
                )}
              </div>
            )}

            <div className="flex min-h-0 flex-col gap-1.5">
              <span className="font-medium">
                그대로 둘 가구{" "}
                <span className="font-normal text-neutral-500">(러그는 항상 그대로)</span>
              </span>
              {movable.length === 0 ? (
                <p className="text-neutral-500">이 방에는 옮길 가구가 없어요.</p>
              ) : (
                <ul className="min-h-0 overflow-y-auto rounded-md border border-neutral-200 p-1">
                  {movable.map(({ item, room }) => (
                    <li key={item.id}>
                      <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-neutral-50">
                        <input
                          type="checkbox"
                          checked={fixed.has(item.id)}
                          onChange={() => toggle(item.id)}
                        />
                        <span className="flex-1">{item.name}</span>
                        {rooms.length > 1 && (
                          <span className="text-xs text-neutral-500">{room?.name}</span>
                        )}
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-2">
          {done ? (
            <>
              <Button onClick={onClose}>닫기</Button>
              <Button
                variant="primary"
                autoFocus
                onClick={() => {
                  useEditorStore.getState().setView("compare");
                  onClose();
                }}
              >
                원래 배치와 비교
              </Button>
            </>
          ) : (
            <>
              <Button onClick={close} disabled={busy}>
                취소
              </Button>
              <Button
                variant="primary"
                autoFocus
                disabled={
                  busy || movable.length === 0 || movable.every(({ item }) => fixed.has(item.id))
                }
                onClick={() => void run()}
              >
                {busy ? "배치하는 중…" : "자동 배치하기"}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
