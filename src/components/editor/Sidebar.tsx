"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  generateHouse,
  MAX_BATHROOMS,
  MAX_BEDROOMS,
  type AreaBasis,
  type AreaUnit,
} from "@/catalog/generateHouse";
import { ROOM_PRESETS, type RoomPreset } from "@/catalog/roomPresets";
import { rectPoints } from "@/geometry/roomEdit";
import { translatePoints } from "@/geometry/roomEdit";
import { bounds } from "@/geometry/polygon";
import { useEditorStore } from "@/store/editorStore";
import { Button, LengthField, Section, Segmented } from "./fields";
import { FurniturePanel } from "./FurniturePanel";

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

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[2.5rem_1fr] items-center gap-2 text-xs text-neutral-600">
      <span>{label}</span>
      {children}
    </div>
  );
}

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";

function AreaGenerator({ applyPreset }: { applyPreset: (preset: RoomPreset) => boolean }) {
  const [areaText, setAreaText] = useState("32");
  const [unit, setUnit] = useState<AreaUnit>("pyeong");
  const [basis, setBasis] = useState<AreaBasis>("supply");
  const [bedrooms, setBedrooms] = useState(3);
  const [bathrooms, setBathrooms] = useState(2);
  const [generated, setGenerated] = useState(false);

  const result = useMemo(
    () => generateHouse({ area: Number(areaText), unit, basis, bedrooms, bathrooms }),
    [areaText, unit, basis, bedrooms, bathrooms],
  );

  return (
    <Section title="면적으로 집 만들기">
      <p className="text-xs leading-relaxed text-neutral-500">
        평면도가 없으면 면적과 방 개수로 대략적인 구조를 만들어 드려요.
      </p>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <input
          type="number"
          inputMode="decimal"
          min={1}
          value={areaText}
          aria-label="면적"
          onChange={(e) => setAreaText(e.target.value)}
          className={`${inputClass} tabular-nums`}
        />
        <Segmented
          ariaLabel="면적 단위"
          value={unit}
          onChange={setUnit}
          options={[
            { value: "pyeong", label: "평" },
            { value: "m2", label: "㎡" },
          ]}
        />
      </div>
      <Field label="기준">
        <Segmented
          ariaLabel="면적 기준"
          value={basis}
          onChange={setBasis}
          options={[
            {
              value: "supply",
              label: "공급",
              title: "흔히 말하는 '○○평'. 공용 공간까지 포함한 면적이에요",
            },
            { value: "exclusive", label: "전용", title: "현관 안쪽 실제로 쓰는 면적이에요" },
          ]}
        />
      </Field>
      <Field label="방">
        <Segmented
          ariaLabel="방 개수"
          value={bedrooms}
          onChange={setBedrooms}
          options={[
            { value: 0, label: "원룸" },
            ...Array.from({ length: MAX_BEDROOMS }, (_, i) => ({
              value: i + 1,
              label: `${i + 1}`,
            })),
          ]}
        />
      </Field>
      <Field label="욕실">
        <Segmented
          ariaLabel="욕실 개수"
          value={bathrooms}
          onChange={setBathrooms}
          options={Array.from({ length: MAX_BATHROOMS }, (_, i) => ({
            value: i + 1,
            label: `${i + 1}`,
          }))}
        />
      </Field>

      {result.ok ? (
        <div className="flex items-center gap-3 rounded-md bg-neutral-50 px-2 py-1.5">
          <PresetThumb preset={result.preset} />
          <span className="flex flex-col">
            <span className="text-sm font-medium text-neutral-800">
              전용 약 {Math.round(result.exclusiveM2)}㎡
            </span>
            <span className="text-xs text-neutral-500">
              {result.preset.description} · 공간 {result.preset.rooms.length}개
            </span>
          </span>
        </div>
      ) : (
        <p className="text-xs leading-relaxed text-red-600">{result.reason}</p>
      )}

      <Button
        variant="primary"
        disabled={!result.ok}
        onClick={() => {
          if (result.ok && applyPreset(result.preset)) setGenerated(true);
        }}
      >
        구조 만들기
      </Button>

      {generated && (
        <p className="rounded-md bg-amber-50 px-2 py-1.5 text-xs leading-relaxed text-amber-800">
          치수는 추정치예요. 가구를 놓을 방은 줄자로 재서 벽을 끌어 맞춰 주세요. 발코니를 확장한
          집은 실제보다 작게 나올 수 있어요.
        </p>
      )}
    </Section>
  );
}

function StructurePanel() {
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
      return false;
    }
    useEditorStore.getState().applyPreset(preset);
    return true;
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
    <>
      <Section title="도구">
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="ghost"
            active={tool === "select"}
            onClick={() => setTool("select")}
            title="선택 (V)"
          >
            선택 <kbd className="text-xs text-neutral-500">V</kbd>
          </Button>
          <Button
            variant="ghost"
            active={tool === "rect"}
            onClick={() => setTool("rect")}
            title="끌어서 사각형 방 그리기 (R)"
          >
            방 그리기 <kbd className="text-xs text-neutral-500">R</kbd>
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

      <AreaGenerator applyPreset={applyPreset} />

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
          <li>벽 클릭 → 오른쪽 패널에서 문·창문 달기</li>
          <li>문·창문 드래그: 벽을 따라 이동</li>
          <li>Delete: 선택한 방·꼭짓점·문 삭제</li>
          <li>⌘Z / ⇧⌘Z: 실행 취소 / 다시 실행</li>
        </ul>
      </Section>
    </>
  );
}

export function Sidebar() {
  const mode = useEditorStore((s) => s.mode);
  return (
    <aside className="flex w-64 shrink-0 flex-col overflow-y-auto border-r border-neutral-200 bg-white">
      {mode === "structure" ? <StructurePanel /> : <FurniturePanel />}
    </aside>
  );
}
