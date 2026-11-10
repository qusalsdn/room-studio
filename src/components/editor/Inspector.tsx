"use client";

import { ROOM_COLORS, type Room } from "@/domain/document";
import { distance, edgeAt, polygonArea } from "@/geometry/polygon";
import { removeVertex, setEdgeLength, splitEdge } from "@/geometry/roomEdit";
import { MIN_EDGE } from "@/geometry/roomEdit";
import { formatArea } from "@/lib/format";
import { findItem, selectedRoomId, useEditorStore } from "@/store/editorStore";
import { Button, LengthField, Section, TextField } from "./fields";
import {
  FurnitureInspector,
  FurnitureListSection,
  OpeningInspector,
  WallOpeningsSection,
} from "./ObjectInspectors";
import { WarningsSection } from "./WarningsSection";
import { DEFAULT_MIN_PASSAGE } from "@/domain/warnings";

export function Inspector() {
  const doc = useEditorStore((s) => s.doc);
  const selection = useEditorStore((s) => s.selection);
  const mode = useEditorStore((s) => s.mode);
  const roomId = selectedRoomId(selection);
  const room = roomId ? doc.floorplan.rooms.find((r) => r.id === roomId) : undefined;
  const item = selection?.kind === "furniture" ? findItem(doc, selection.itemId) : undefined;
  const opening =
    selection?.kind === "opening"
      ? doc.floorplan.openings.find((o) => o.id === selection.openingId)
      : undefined;

  let content;
  if (item) content = <FurnitureInspector key={item.id} item={item} />;
  else if (opening && room)
    content = <OpeningInspector key={opening.id} opening={opening} room={room} />;
  else if (room && mode === "structure") content = <RoomInspector room={room} />;
  else content = <HouseInspector />;

  return (
    <aside className="flex w-72 shrink-0 flex-col overflow-y-auto border-l border-neutral-200 bg-white">
      {content}
    </aside>
  );
}

function HouseInspector() {
  const doc = useEditorStore((s) => s.doc);
  const mode = useEditorStore((s) => s.mode);
  const s = useEditorStore.getState;
  const { settings } = doc;
  const totalArea = doc.floorplan.rooms.reduce((sum, r) => sum + polygonArea(r.points), 0);

  return (
    <>
      <Section title="집">
        <label className="flex flex-col gap-1 text-xs text-neutral-600">
          이름
          <TextField value={doc.name} ariaLabel="집 이름" onCommit={(v) => s().setHouseName(v)} />
        </label>
        <p className="text-sm text-neutral-700">
          방 {doc.floorplan.rooms.length}개 · 합계 {formatArea(totalArea)}
        </p>
      </Section>

      <Section title="설정">
        <label className="flex flex-col gap-1 text-xs text-neutral-600">
          벽 두께
          <LengthField
            valueMm={settings.wallThickness}
            unit={settings.displayUnit}
            min={50}
            ariaLabel="벽 두께"
            onCommit={(mm) => s().setSettings({ wallThickness: Math.min(mm, 500) })}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-neutral-600">
          천장 높이
          <LengthField
            valueMm={settings.wallHeight}
            unit={settings.displayUnit}
            min={1800}
            ariaLabel="천장 높이"
            onCommit={(mm) => s().setSettings({ wallHeight: mm })}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-neutral-600">
          통로 최소 폭 (이보다 좁으면 알려 줘요)
          <LengthField
            valueMm={settings.minPassage ?? DEFAULT_MIN_PASSAGE}
            unit={settings.displayUnit}
            min={300}
            ariaLabel="통로 최소 폭"
            onCommit={(mm) => s().setSettings({ minPassage: Math.min(mm, 2000) })}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-neutral-600">
          표시 단위
          <select
            value={settings.displayUnit}
            onChange={(e) =>
              s().setSettings({ displayUnit: e.currentTarget.value as typeof settings.displayUnit })
            }
            className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm"
          >
            <option value="cm">cm</option>
            <option value="mm">mm</option>
            <option value="m">m</option>
          </select>
        </label>
      </Section>

      {mode === "furniture" && <WarningsSection />}
      {mode === "furniture" && <FurnitureListSection />}

      <Section title="방 목록">
        {doc.floorplan.rooms.length === 0 ? (
          <p className="text-sm text-neutral-500">아직 방이 없어요.</p>
        ) : (
          <ul className="flex flex-col">
            {doc.floorplan.rooms.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-neutral-100"
                  onClick={() => s().select({ kind: "room", roomId: r.id })}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="size-3 rounded-sm ring-1 ring-neutral-300"
                      style={{ background: r.floorColor }}
                    />
                    {r.name}
                  </span>
                  <span className="text-xs text-neutral-500">
                    {formatArea(polygonArea(r.points))}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {doc.floorplan.rooms.length > 0 && (
          <Button
            variant="danger"
            onClick={() => {
              if (window.confirm("모든 방을 지울까요? 실행 취소로 되돌릴 수 있어요.")) {
                s().resetDocument();
              }
            }}
          >
            전부 지우기
          </Button>
        )}
      </Section>
    </>
  );
}

function RoomInspector({ room }: { room: Room }) {
  const unit = useEditorStore((s) => s.doc.settings.displayUnit);
  const selection = useEditorStore((s) => s.selection);
  const hoveredEdge = useEditorStore((s) => s.hoveredEdge);
  const s = useEditorStore.getState;
  const vertexIndex = selection?.kind === "vertex" ? selection.index : null;

  return (
    <>
      <Section title="방">
        <label className="flex flex-col gap-1 text-xs text-neutral-600">
          이름
          <TextField
            value={room.name}
            ariaLabel="방 이름"
            onCommit={(v) => s().renameRoom(room.id, v)}
          />
        </label>
        <p className="text-sm text-neutral-700">면적 {formatArea(polygonArea(room.points))}</p>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="바닥 색">
          {ROOM_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={room.floorColor === c}
              aria-label={`바닥 색 ${c}`}
              onClick={() => s().setRoomColor(room.id, c)}
              className={`size-6 rounded-md ring-1 ${room.floorColor === c ? "ring-2 ring-blue-500" : "ring-neutral-300"}`}
              style={{ background: c }}
            />
          ))}
        </div>
      </Section>

      <Section title="벽 길이 (안쪽 기준)">
        <ol className="flex flex-col gap-1">
          {room.points.map((_, i) => {
            const [a, b] = edgeAt(room.points, i);
            const len = Math.round(distance(a, b));
            const hl =
              (hoveredEdge?.roomId === room.id && hoveredEdge.edgeIndex === i) ||
              (selection?.kind === "edge" && selection.edgeIndex === i);
            return (
              <li
                key={i}
                className={`flex items-center gap-2 rounded-md px-1.5 py-1 ${hl ? "bg-blue-50" : ""}`}
                onMouseEnter={() => s().setHoveredEdge({ roomId: room.id, edgeIndex: i })}
                onMouseLeave={() => s().setHoveredEdge(null)}
              >
                <span className="w-10 shrink-0 text-xs text-neutral-500">벽 {i + 1}</span>
                <LengthField
                  valueMm={len}
                  unit={unit}
                  min={MIN_EDGE}
                  ariaLabel={`벽 ${i + 1} 길이`}
                  onCommit={(mm) => {
                    const ok = s().setRoomPoints(room.id, setEdgeLength(room.points, i, mm));
                    if (!ok) window.alert("이 길이로 바꾸면 벽이 서로 겹쳐요.");
                    return ok;
                  }}
                />
                <button
                  type="button"
                  title="이 벽 가운데에 꼭짓점 추가"
                  className="shrink-0 rounded px-1.5 py-1 text-xs text-neutral-500 hover:bg-neutral-100"
                  onClick={() => {
                    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
                    if (s().setRoomPoints(room.id, splitEdge(room.points, i, mid))) {
                      s().select({ kind: "vertex", roomId: room.id, index: i + 1 });
                    }
                  }}
                >
                  나누기
                </button>
              </li>
            );
          })}
        </ol>
        <p className="text-xs leading-relaxed text-neutral-500">
          길이를 바꾸면 그 벽 끝 너머가 함께 밀려서 직각이 유지돼요.
        </p>
      </Section>

      {selection?.kind === "edge" && (
        <WallOpeningsSection room={room} edgeIndex={selection.edgeIndex} />
      )}

      <Section title="편집">
        {vertexIndex !== null && (
          <Button
            disabled={room.points.length <= 3}
            onClick={() => {
              if (s().setRoomPoints(room.id, removeVertex(room.points, vertexIndex))) {
                s().select({ kind: "room", roomId: room.id });
              }
            }}
          >
            선택한 꼭짓점 삭제
          </Button>
        )}
        <Button variant="danger" onClick={() => s().deleteRoom(room.id)}>
          방 삭제
        </Button>
        <Button variant="ghost" onClick={() => s().select(null)}>
          선택 해제
        </Button>
      </Section>
    </>
  );
}
