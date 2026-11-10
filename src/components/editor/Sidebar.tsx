"use client";

import { useState } from "react";
import { ROOM_PRESETS, type RoomPreset } from "@/catalog/roomPresets";
import { rectPoints } from "@/geometry/roomEdit";
import { translatePoints } from "@/geometry/roomEdit";
import { bounds } from "@/geometry/polygon";
import { useEditorStore } from "@/store/editorStore";
import { Button, LengthField, Section } from "./fields";

function PresetThumb({ preset }: { preset: RoomPreset }) {
  const pts = preset.rooms.flatMap((r) => r.points);
  const b = bounds(pts);
  const w = b.maxX - b.minX;
  const h = b.maxY - b.minY;
  const pad = Math.max(w, h) * 0.06;
  return (
    <svg
      viewBox={`${b.minX - pad} ${b.minY - pad} ${w + pad * 2} ${h + pad * 2}`}
      className="h-10 w-12 shrink-0"
      aria-hidden
    >
      {preset.rooms.map((r, i) => (
        <polygon
          key={i}
          points={r.points.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="#f3ede2"
          stroke="#3f3f46"
          strokeWidth={Math.max(w, h) * 0.025}
        />
      ))}
    </svg>
  );
}

export function Sidebar() {
  const tool = useEditorStore((s) => s.tool);
  const setTool = useEditorStore((s) => s.setTool);
  const unit = useEditorStore((s) => s.doc.settings.displayUnit);
  const roomCount = useEditorStore((s) => s.doc.floorplan.rooms.length);
  const [size, setSize] = useState({ w: 3600, h: 3000 });

  const applyPreset = (preset: RoomPreset) => {
    if (
      preset.kind === "house" &&
      roomCount > 0 &&
      !window.confirm(`지금 그린 방 ${roomCount}개를 지우고 '${preset.name}' 구조로 바꿀까요?`)
    ) {
      return;
    }
    useEditorStore.getState().applyPreset(preset);
  };

  const addSizedRoom = () => {
    const s = useEditorStore.getState();
    const all = s.doc.floorplan.rooms.flatMap((r) => r.points);
    const origin = all.length
      ? { x: bounds(all).maxX + 1000, y: bounds(all).minY }
      : { x: 0, y: 0 };
    s.addRoom(`방 ${roomCount + 1}`, translatePoints(rectPoints(0, 0, size.w, size.h), origin));
    s.requestFit();
  };

  return (
    <aside className="flex w-64 shrink-0 flex-col overflow-y-auto border-r border-neutral-200 bg-white">
      <Section title="도구">
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="ghost"
            active={tool === "select"}
            onClick={() => setTool("select")}
            title="선택 (V)"
          >
            선택 <kbd className="text-xs text-neutral-400">V</kbd>
          </Button>
          <Button
            variant="ghost"
            active={tool === "rect"}
            onClick={() => setTool("rect")}
            title="끌어서 사각형 방 그리기 (R)"
          >
            방 그리기 <kbd className="text-xs text-neutral-400">R</kbd>
          </Button>
        </div>
      </Section>

      <Section title="치수로 방 추가">
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 text-xs text-neutral-600">
            가로
            <LengthField
              valueMm={size.w}
              unit={unit}
              min={300}
              ariaLabel="새 방 가로"
              onCommit={(w) => setSize((s) => ({ ...s, w }))}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-neutral-600">
            세로
            <LengthField
              valueMm={size.h}
              unit={unit}
              min={300}
              ariaLabel="새 방 세로"
              onCommit={(h) => setSize((s) => ({ ...s, h }))}
            />
          </label>
        </div>
        <Button variant="primary" onClick={addSizedRoom}>
          방 추가
        </Button>
      </Section>

      <Section title="프리셋">
        <ul className="flex flex-col gap-1">
          {ROOM_PRESETS.map((preset) => (
            <li key={preset.id}>
              <button
                type="button"
                onClick={() => applyPreset(preset)}
                className="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left hover:bg-neutral-100"
              >
                <PresetThumb preset={preset} />
                <span className="flex flex-col">
                  <span className="text-sm font-medium text-neutral-800">{preset.name}</span>
                  <span className="text-xs text-neutral-500">
                    {preset.description} · {preset.kind === "house" ? "집 전체" : "방 추가"}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="조작법">
        <ul className="flex flex-col gap-1 text-xs leading-relaxed text-neutral-600">
          <li>빈 곳 드래그 · Space+드래그: 화면 이동</li>
          <li>휠 · 핀치: 확대/축소, F: 화면 맞춤</li>
          <li>방 드래그: 이동, 방향키: 1cm (Shift 10cm)</li>
          <li>벽 드래그: 벽 밀기, 벽 더블클릭: 꼭짓점 추가</li>
          <li>꼭짓점 드래그: Shift 누르면 직각 유지 해제</li>
          <li>Alt 누른 채 드래그: 5cm 스냅 끄기</li>
          <li>Delete: 선택한 방·꼭짓점 삭제</li>
          <li>⌘Z / ⇧⌘Z: 실행 취소 / 다시 실행</li>
        </ul>
      </Section>
    </aside>
  );
}
