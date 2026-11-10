import type { ReactNode } from "react";
import type { KonvaEventObject } from "konva/lib/Node";
import { Group, Line } from "react-konva";
import type { Opening, Vec2 } from "@/domain/document";
import { doorSwing, openingGeometry } from "@/geometry/openings";
import { add, scale as mul } from "@/geometry/polygon";
import { COLORS } from "./constants";

const flat = (points: Vec2[]) => points.flatMap((p) => [p.x, p.y]);

type Props = {
  points: Vec2[];
  opening: Opening;
  wallThickness: number;
  floorColor: string;
  selected: boolean;
  interactive: boolean;
  scale: number;
  onPointerDown?: (e: KonvaEventObject<PointerEvent>) => void;
  onHover?: (hovering: boolean) => void;
};

/** 벽에 뚫린 문·창 평면 기호 */
export function OpeningShape({
  points,
  opening,
  wallThickness: t,
  floorColor,
  selected,
  interactive,
  scale,
  onPointerDown,
  onHover,
}: Props) {
  const g = openingGeometry(points, opening);
  const out = mul(g.normal, t);
  const gap = [g.start, g.end, add(g.end, out), add(g.start, out)];
  const stroke = selected ? COLORS.accent : COLORS.wall;
  const px = (n: number) => n / scale;

  let symbol: ReactNode = null;
  if (opening.kind === "hinged-door") {
    const s = doorSwing(points, opening, t);
    symbol = (
      <>
        <Line points={flat(s.arc)} stroke={stroke} strokeWidth={px(1)} dash={[px(4), px(3)]} />
        <Line points={flat([s.hinge, s.leafEnd])} stroke={stroke} strokeWidth={px(2.5)} />
      </>
    );
  } else if (opening.kind === "sliding-door") {
    const panel = opening.width * 0.55;
    const a1 = add(g.start, mul(g.normal, t * 0.33));
    const a2 = add(g.end, mul(g.normal, t * 0.67));
    symbol = (
      <>
        <Line
          points={flat([a1, add(a1, mul(g.dir, panel))])}
          stroke={stroke}
          strokeWidth={Math.max(px(2.5), t * 0.2)}
        />
        <Line
          points={flat([a2, add(a2, mul(g.dir, -panel))])}
          stroke={stroke}
          strokeWidth={Math.max(px(2.5), t * 0.2)}
        />
      </>
    );
  } else {
    const mid = mul(g.normal, t / 2);
    symbol = (
      <>
        <Line points={flat([g.start, g.end])} stroke={stroke} strokeWidth={px(1)} />
        <Line
          points={flat([add(g.start, mid), add(g.end, mid)])}
          stroke={stroke}
          strokeWidth={px(1.5)}
        />
        <Line
          points={flat([add(g.start, out), add(g.end, out)])}
          stroke={stroke}
          strokeWidth={px(1)}
        />
      </>
    );
  }

  return (
    <Group listening={interactive}>
      <Line
        points={flat(gap)}
        closed
        fill={opening.kind === "window" ? "#ffffff" : floorColor}
        stroke={selected ? COLORS.accent : undefined}
        strokeWidth={selected ? px(2) : 0}
        hitStrokeWidth={px(10)}
        onPointerDown={onPointerDown}
        onMouseEnter={() => onHover?.(true)}
        onMouseLeave={() => onHover?.(false)}
      />
      {/* 문틀 */}
      <Line points={flat([g.start, add(g.start, out)])} stroke={COLORS.wall} strokeWidth={px(1)} />
      <Line points={flat([g.end, add(g.end, out)])} stroke={COLORS.wall} strokeWidth={px(1)} />
      <Group listening={false}>{symbol}</Group>
    </Group>
  );
}
