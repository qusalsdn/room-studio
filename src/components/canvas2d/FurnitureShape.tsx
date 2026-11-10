import type { ReactNode } from "react";
import type { KonvaEventObject } from "konva/lib/Node";
import { Circle, Ellipse, Group, Line, Rect } from "react-konva";
import { symbolOf } from "@/catalog/furniture";
import { lShapeLocal, RESIZE_HANDLES, type ResizeHandle } from "@/geometry/furniture";
import type { FurnitureItem } from "@/domain/document";
import { COLORS } from "./constants";

type Props = {
  item: FurnitureItem;
  selected: boolean;
  interactive: boolean;
  dimmed: boolean;
  scale: number;
  onPointerDown?: (e: KonvaEventObject<PointerEvent>) => void;
  onRotateStart?: (e: KonvaEventObject<PointerEvent>) => void;
  onResizeStart?: (handle: ResizeHandle) => (e: KonvaEventObject<PointerEvent>) => void;
  onHover?: (cursor: string | null) => void;
};

const OUTLINE = "rgba(39, 39, 42, 0.55)";
const DETAIL = "rgba(39, 39, 42, 0.35)";
const RESIZE_CURSORS = ["ew-resize", "nwse-resize", "ns-resize", "nesw-resize"];

/** 손잡이가 화면에서 향하는 방향에 맞는 크기 조절 커서 */
function resizeCursor(h: ResizeHandle, rotation: number): string {
  const deg = (Math.atan2(h.sy, h.sx) * 180) / Math.PI + rotation;
  const bucket = Math.round((((deg % 180) + 180) % 180) / 45) % 4;
  return RESIZE_CURSORS[bucket];
}

/** 가구 평면 기호. 원점은 가구 중심, 회전 0일 때 등받이·머리판이 위(-y) */
export function FurnitureShape({
  item,
  selected,
  interactive,
  dimmed,
  scale,
  onPointerDown,
  onRotateStart,
  onResizeStart,
  onHover,
}: Props) {
  const { width: w, depth: d, color } = item;
  const symbol = symbolOf(item.catalogId);
  const px = (n: number) => n / scale;
  const x0 = -w / 2;
  const y0 = -d / 2;
  const stroke = selected ? COLORS.accent : OUTLINE;
  const strokeWidth = px(selected ? 2 : 1);

  let detail: ReactNode = null;
  if (symbol === "bed") {
    const head = Math.min(80, d * 0.05);
    const pillowCount = w >= 1300 ? 2 : 1;
    const gapX = 100;
    const pw = (w - gapX * (pillowCount + 1)) / pillowCount;
    const ph = Math.min(350, d * 0.18);
    detail = (
      <>
        <Rect x={x0} y={y0} width={w} height={head} fill={DETAIL} />
        {Array.from({ length: pillowCount }, (_, i) => (
          <Rect
            key={i}
            x={x0 + gapX + i * (pw + gapX)}
            y={y0 + head + 80}
            width={pw}
            height={ph}
            cornerRadius={60}
            fill="rgba(255,255,255,0.85)"
            stroke={DETAIL}
            strokeWidth={px(1)}
          />
        ))}
        <Line
          points={[x0, y0 + head + ph + 220, x0 + w, y0 + head + ph + 220]}
          stroke={DETAIL}
          strokeWidth={px(1)}
        />
      </>
    );
  } else if (symbol === "sofa") {
    const back = Math.min(220, d * 0.25);
    const arm = Math.min(200, w * 0.12);
    const seats = Math.max(1, Math.round((w - arm * 2) / 650));
    const seatW = (w - arm * 2) / seats;
    detail = (
      <>
        <Rect x={x0} y={y0} width={w} height={back} fill={DETAIL} />
        <Rect x={x0} y={y0 + back} width={arm} height={d - back} fill={DETAIL} />
        <Rect x={-x0 - arm} y={y0 + back} width={arm} height={d - back} fill={DETAIL} />
        {Array.from({ length: seats - 1 }, (_, i) => (
          <Line
            key={i}
            points={[x0 + arm + seatW * (i + 1), y0 + back, x0 + arm + seatW * (i + 1), -y0 - 40]}
            stroke={DETAIL}
            strokeWidth={px(1)}
          />
        ))}
      </>
    );
  } else if (symbol === "hanger") {
    // 가운데 봉 + 걸린 옷걸이
    const pitch = 120;
    const count = Math.max(1, Math.floor((w - 160) / pitch));
    const start = -((count - 1) * pitch) / 2;
    detail = (
      <>
        <Line points={[x0 + 40, 0, -x0 - 40, 0]} stroke={OUTLINE} strokeWidth={px(2)} />
        {Array.from({ length: count }, (_, i) => (
          <Line
            key={i}
            points={[start + i * pitch, y0 + d * 0.15, start + i * pitch, -y0 - d * 0.15]}
            stroke={DETAIL}
            strokeWidth={px(1)}
          />
        ))}
      </>
    );
  } else if (symbol === "plain") {
    // 뒤쪽 면을 굵게 표시해 방향을 알 수 있게
    detail = (
      <Line points={[x0, y0, -x0, y0]} stroke={OUTLINE} strokeWidth={Math.min(px(3), d / 4)} />
    );
  }

  const lPoints = symbol === "l-shape" ? lShapeLocal(w, d).flatMap((p) => [p.x, p.y]) : null;

  const body = lPoints ? (
    <Line points={lPoints} closed fill={color} stroke={stroke} strokeWidth={strokeWidth} />
  ) : symbol === "round" ? (
    <Ellipse
      radiusX={w / 2}
      radiusY={d / 2}
      fill={color}
      stroke={stroke}
      strokeWidth={strokeWidth}
    />
  ) : (
    <Rect
      x={x0}
      y={y0}
      width={w}
      height={d}
      fill={color}
      opacity={symbol === "rug" ? 0.6 : symbol === "hanger" ? 0.5 : 1}
      stroke={stroke}
      strokeWidth={strokeWidth}
      dash={symbol === "rug" ? [px(5), px(4)] : undefined}
      cornerRadius={symbol === "sofa" ? 60 : 0}
    />
  );

  const handleY = y0 - px(26);

  return (
    <Group
      x={item.x}
      y={item.y}
      rotation={item.rotation}
      opacity={dimmed ? 0.45 : 1}
      listening={interactive}
    >
      <Group
        onPointerDown={onPointerDown}
        onMouseEnter={() => onHover?.("move")}
        onMouseLeave={() => onHover?.(null)}
      >
        {body}
        <Group listening={false}>{detail}</Group>
        {selected && lPoints && (
          <Line
            points={lPoints}
            closed
            stroke={COLORS.accent}
            strokeWidth={px(2)}
            listening={false}
          />
        )}
        {selected && symbol !== "round" && !lPoints && (
          <Rect
            x={x0}
            y={y0}
            width={w}
            height={d}
            stroke={COLORS.accent}
            strokeWidth={px(2)}
            listening={false}
          />
        )}
      </Group>
      {selected && interactive && onResizeStart && (
        <>
          {/* 변 전체를 잡아 늘일 수 있도록 투명한 선을 깐다 */}
          {RESIZE_HANDLES.filter((h) => h.sx === 0 || h.sy === 0).map((h) => {
            const points =
              h.sx === 0
                ? [x0, (h.sy * d) / 2, -x0, (h.sy * d) / 2]
                : [(h.sx * w) / 2, y0, (h.sx * w) / 2, -y0];
            return (
              <Line
                key={`edge-${h.sx}-${h.sy}`}
                points={points}
                stroke="rgba(0,0,0,0)"
                hitStrokeWidth={px(10)}
                onPointerDown={onResizeStart(h)}
                onMouseEnter={() => onHover?.(resizeCursor(h, item.rotation))}
                onMouseLeave={() => onHover?.(null)}
              />
            );
          })}
          {RESIZE_HANDLES.map((h) => {
            const size = px(h.sx !== 0 && h.sy !== 0 ? 9 : 7);
            return (
              <Rect
                key={`handle-${h.sx}-${h.sy}`}
                x={(h.sx * w) / 2 - size / 2}
                y={(h.sy * d) / 2 - size / 2}
                width={size}
                height={size}
                fill="#ffffff"
                stroke={COLORS.accent}
                strokeWidth={px(1.5)}
                hitStrokeWidth={px(8)}
                onPointerDown={onResizeStart(h)}
                onMouseEnter={() => onHover?.(resizeCursor(h, item.rotation))}
                onMouseLeave={() => onHover?.(null)}
              />
            );
          })}
        </>
      )}
      {selected && interactive && (
        <>
          <Line points={[0, y0, 0, handleY]} stroke={COLORS.accent} strokeWidth={px(1.5)} />
          <Circle
            y={handleY}
            radius={px(7)}
            fill="#ffffff"
            stroke={COLORS.accent}
            strokeWidth={px(1.5)}
            hitStrokeWidth={px(10)}
            onPointerDown={onRotateStart}
            onMouseEnter={() => onHover?.("grab")}
            onMouseLeave={() => onHover?.(null)}
          />
        </>
      )}
    </Group>
  );
}
