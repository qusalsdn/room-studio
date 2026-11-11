"use client";

import { FURNITURE_COLORS } from "@/catalog/furniture";
import type { FurnitureItem, Opening, Room } from "@/domain/document";
import { MIN_OPENING_WIDTH, OPENING_LABELS } from "@/geometry/openings";
import { edgeLength } from "@/geometry/polygon";
import { activeLayout, useEditorStore } from "@/store/editorStore";
import { Button, LengthField, Section, Segmented, TextField } from "./fields";
import { SuggestionSection } from "./SuggestionSection";
import { WarningsSection } from "./WarningsSection";

const fieldLabel = "flex flex-col gap-1 text-xs text-neutral-600";

export function FurnitureInspector({ item }: { item: FurnitureItem }) {
  const unit = useEditorStore((s) => s.doc.settings.displayUnit);
  const s = useEditorStore.getState;
  const update = (patch: Partial<FurnitureItem>) => s().updateFurniture(item.id, patch);

  return (
    <>
      <Section title="가구">
        <label className={fieldLabel}>
          이름
          <TextField
            value={item.name}
            ariaLabel="가구 이름"
            onCommit={(name) => update({ name })}
          />
        </label>
      </Section>

      <WarningsSection itemId={item.id} />

      <SuggestionSection itemId={item.id} />

      <Section title="치수 (실측값으로 바꿔 주세요)">
        <div className="grid grid-cols-2 gap-2">
          <label className={fieldLabel}>
            가로
            <LengthField
              valueMm={item.width}
              unit={unit}
              min={50}
              ariaLabel="가구 가로"
              onCommit={(width) => update({ width })}
            />
          </label>
          <label className={fieldLabel}>
            깊이
            <LengthField
              valueMm={item.depth}
              unit={unit}
              min={20}
              ariaLabel="가구 깊이"
              onCommit={(depth) => update({ depth })}
            />
          </label>
          <label className={fieldLabel}>
            높이
            <LengthField
              valueMm={item.height}
              unit={unit}
              min={5}
              ariaLabel="가구 높이"
              onCommit={(height) => update({ height })}
            />
          </label>
        </div>
      </Section>

      <Section title="회전">
        <div className="flex items-center gap-2">
          <input
            key={item.rotation}
            type="number"
            defaultValue={Math.round(item.rotation)}
            aria-label="회전 각도"
            className="w-20 rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm tabular-nums outline-none focus:border-blue-500"
            onBlur={(e) => {
              const v = Number(e.currentTarget.value);
              if (Number.isFinite(v) && v !== item.rotation) update({ rotation: v });
            }}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          />
          <span className="text-xs text-neutral-500">°</span>
          <Button onClick={() => update({ rotation: item.rotation - 90 })} title="Shift+R">
            ↺ 90°
          </Button>
          <Button onClick={() => update({ rotation: item.rotation + 90 })} title="R">
            ↻ 90°
          </Button>
        </div>
      </Section>

      <Section title="색">
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="가구 색">
          {FURNITURE_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={item.color === c}
              aria-label={`색 ${c}`}
              onClick={() => update({ color: c })}
              className={`size-6 rounded-md ring-1 ${item.color === c ? "ring-2 ring-blue-500" : "ring-neutral-300"}`}
              style={{ background: c }}
            />
          ))}
        </div>
      </Section>

      <Section title="편집">
        <Button onClick={() => s().duplicateFurniture(item.id)} title="⌘D">
          복제
        </Button>
        <Button variant="danger" onClick={() => s().deleteFurniture(item.id)}>
          삭제
        </Button>
        <Button variant="ghost" onClick={() => s().select(null)}>
          선택 해제
        </Button>
      </Section>
    </>
  );
}

export function OpeningInspector({ opening, room }: { opening: Opening; room: Room }) {
  const unit = useEditorStore((s) => s.doc.settings.displayUnit);
  const s = useEditorStore.getState;
  const update = (patch: Partial<Opening>) => s().updateOpening(opening.id, patch);
  const wallLen = Math.round(edgeLength(room.points, opening.edgeIndex));
  const isDoor = opening.kind !== "window";

  return (
    <>
      <Section title={`${OPENING_LABELS[opening.kind]} · ${room.name} 벽 ${opening.edgeIndex + 1}`}>
        <div className={fieldLabel}>
          종류
          <Segmented
            ariaLabel="문·창문 종류"
            value={opening.kind}
            onChange={(kind) => update({ kind })}
            options={(Object.keys(OPENING_LABELS) as Opening["kind"][]).map((k) => ({
              value: k,
              label: OPENING_LABELS[k],
            }))}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className={fieldLabel}>
            폭
            <LengthField
              valueMm={opening.width}
              unit={unit}
              min={MIN_OPENING_WIDTH}
              ariaLabel="문 폭"
              onCommit={(width) => update({ width })}
            />
          </label>
          <label className={fieldLabel}>
            높이
            <LengthField
              valueMm={opening.height}
              unit={unit}
              min={300}
              ariaLabel="문 높이"
              onCommit={(height) => update({ height })}
            />
          </label>
          {!isDoor && (
            <label className={fieldLabel}>
              바닥에서 창 아래까지
              <LengthField
                valueMm={opening.sillHeight}
                unit={unit}
                min={0}
                ariaLabel="창 높이 위치"
                onCommit={(sillHeight) => update({ sillHeight })}
              />
            </label>
          )}
          <label className={fieldLabel}>
            벽 시작점에서
            <LengthField
              valueMm={opening.offset}
              unit={unit}
              min={0}
              ariaLabel="벽 시작점에서 거리"
              onCommit={(offset) => update({ offset })}
            />
          </label>
        </div>
        <p className="text-xs text-neutral-500">
          벽 길이 {wallLen / 10}cm · 캔버스에서 끌어 옮길 수 있어요.
        </p>
      </Section>

      {opening.kind === "hinged-door" && (
        <Section title="여는 방향">
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() =>
                update({
                  swing: { ...opening.swing, side: opening.swing.side === "in" ? "out" : "in" },
                })
              }
            >
              {opening.swing.side === "in" ? "방 안쪽으로" : "방 바깥쪽으로"}
            </Button>
            <Button
              onClick={() =>
                update({
                  swing: {
                    ...opening.swing,
                    hinge: opening.swing.hinge === "start" ? "end" : "start",
                  },
                })
              }
            >
              경첩 반대로
            </Button>
          </div>
        </Section>
      )}

      <Section title="편집">
        <Button variant="danger" onClick={() => s().deleteOpening(opening.id)}>
          삭제
        </Button>
        <Button variant="ghost" onClick={() => s().select({ kind: "room", roomId: room.id })}>
          방 선택으로 돌아가기
        </Button>
      </Section>
    </>
  );
}

/** 벽을 선택했을 때 문·창문 달기 */
export function WallOpeningsSection({ room, edgeIndex }: { room: Room; edgeIndex: number }) {
  const s = useEditorStore.getState;
  const short = edgeLength(room.points, edgeIndex) < MIN_OPENING_WIDTH;
  return (
    <Section title={`선택한 벽 ${edgeIndex + 1}에 달기`}>
      <div className="grid grid-cols-3 gap-2">
        {(["hinged-door", "sliding-door", "window"] as const).map((kind) => (
          <Button
            key={kind}
            disabled={short}
            onClick={() => s().addOpening(room.id, edgeIndex, kind)}
          >
            {OPENING_LABELS[kind]}
          </Button>
        ))}
      </div>
      {short && <p className="text-xs text-neutral-500">벽이 너무 짧아요.</p>}
    </Section>
  );
}

export function FurnitureListSection() {
  const items = useEditorStore((s) => activeLayout(s.doc).items);
  const unit = useEditorStore((s) => s.doc.settings.displayUnit);
  const s = useEditorStore.getState;
  return (
    <Section title={`가구 ${items.length}개`}>
      {items.length === 0 ? (
        <p className="text-sm text-neutral-500">왼쪽 목록에서 가구를 추가해 보세요.</p>
      ) : (
        <ul className="flex flex-col">
          {items.map((i) => (
            <li key={i.id}>
              <button
                type="button"
                onClick={() => s().select({ kind: "furniture", itemId: i.id })}
                className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-neutral-100"
              >
                <span className="flex items-center gap-2">
                  <span
                    className="size-3 rounded-sm ring-1 ring-neutral-300"
                    style={{ background: i.color }}
                  />
                  {i.name}
                </span>
                <span className="text-xs text-neutral-500 tabular-nums">
                  {i.width / (unit === "mm" ? 1 : 10)} × {i.depth / (unit === "mm" ? 1 : 10)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
