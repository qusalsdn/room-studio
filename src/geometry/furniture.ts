import type { FurnitureItem, Room, Vec2 } from "@/domain/document";
import { bounds, edgeAt, edgeAxis, type Bounds } from "@/geometry/polygon";

type Placement = Pick<FurnitureItem, "x" | "y" | "rotation" | "width" | "depth">;

export function normalizeAngle(deg: number): number {
  const a = deg % 360;
  return a < 0 ? a + 360 : a + 0; // -0 방지
}

export function snapAngle(deg: number, step = 15): number {
  return normalizeAngle(Math.round(deg / step) * step);
}

/**
 * ㄱ자 가구의 로컬 윤곽 (가구 중심 원점, 회전 0일 때 꺾인 모서리가 왼쪽 위).
 * 두 팔의 폭이 같아서 회전만으로 좌우 반전 모양도 만들 수 있다.
 */
export function lShapeLocal(w: number, d: number, arm = 600): Vec2[] {
  const a = Math.min(arm, w * 0.45, d * 0.45);
  const x0 = -w / 2;
  const y0 = -d / 2;
  return [
    { x: x0, y: y0 },
    { x: -x0, y: y0 },
    { x: -x0, y: y0 + a },
    { x: x0 + a, y: y0 + a },
    { x: x0 + a, y: -y0 },
    { x: x0, y: -y0 },
  ];
}

/** 이름표를 놓을 점. ㄱ자 가구는 가운데가 비어 있으므로 윗팔 가운데에 둔다. */
export function itemLabelPoint(item: Placement, lShape: boolean): Vec2 {
  if (!lShape) return { x: item.x, y: item.y };
  const a = Math.min(600, item.width * 0.45, item.depth * 0.45);
  const local = { x: 0, y: -item.depth / 2 + a / 2 };
  const r = (item.rotation * Math.PI) / 180;
  return {
    x: item.x + local.x * Math.cos(r) - local.y * Math.sin(r),
    y: item.y + local.x * Math.sin(r) + local.y * Math.cos(r),
  };
}

/** 회전된 가구 사각형의 네 꼭짓점 (시계방향, 회전 0이면 왼쪽 위부터) */
export function itemCorners(item: Placement): Vec2[] {
  const r = (item.rotation * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  const hw = item.width / 2;
  const hd = item.depth / 2;
  return [
    { x: -hw, y: -hd },
    { x: hw, y: -hd },
    { x: hw, y: hd },
    { x: -hw, y: hd },
  ].map((p) => ({ x: item.x + p.x * cos - p.y * sin, y: item.y + p.x * sin + p.y * cos }));
}

export function itemBounds(item: Placement): Bounds {
  return bounds(itemCorners(item));
}

export type SnapLines = { xs: number[]; ys: number[] };

/** 가구를 붙일 기준선: 방 안쪽 벽면(수평/수직 벽)과 다른 가구의 바깥 경계 */
export function collectSnapLines(rooms: Room[], others: Placement[]): SnapLines {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const room of rooms) {
    room.points.forEach((_, i) => {
      const [a, b] = edgeAt(room.points, i);
      const axis = edgeAxis(a, b);
      if (axis === "vertical") xs.push(a.x);
      if (axis === "horizontal") ys.push(a.y);
    });
  }
  for (const o of others) {
    const b = itemBounds(o);
    xs.push(b.minX, b.maxX, (b.minX + b.maxX) / 2);
    ys.push(b.minY, b.maxY, (b.minY + b.maxY) / 2);
  }
  return { xs, ys };
}

export type SnapResult = { position: Vec2; guides: { x?: number; y?: number } };

function bestShift(values: number[], lines: number[], threshold: number) {
  let best: { shift: number; line: number } | null = null;
  for (const v of values) {
    for (const line of lines) {
      const shift = line - v;
      if (Math.abs(shift) <= threshold && (!best || Math.abs(shift) < Math.abs(best.shift))) {
        best = { shift, line };
      }
    }
  }
  return best;
}

/**
 * 가구 위치를 벽·다른 가구에 맞춘다. 가구 경계(좌/우/가운데, 위/아래/가운데) 중
 * threshold 안에 있는 가장 가까운 기준선에 붙인다. 붙지 않은 축은 grid로 반올림.
 */
export function snapItemPosition(
  item: Placement,
  target: Vec2,
  lines: SnapLines,
  threshold: number,
  grid: number,
): SnapResult {
  const b = itemBounds({ ...item, x: 0, y: 0 });
  const position = { x: Math.round(target.x / grid) * grid, y: Math.round(target.y / grid) * grid };
  const guides: SnapResult["guides"] = {};

  const sx = bestShift([target.x + b.minX, target.x + b.maxX, target.x], lines.xs, threshold);
  if (sx) {
    position.x = Math.round(target.x + sx.shift);
    guides.x = sx.line;
  }
  const sy = bestShift([target.y + b.minY, target.y + b.maxY, target.y], lines.ys, threshold);
  if (sy) {
    position.y = Math.round(target.y + sy.shift);
    guides.y = sy.line;
  }
  return { position, guides };
}
