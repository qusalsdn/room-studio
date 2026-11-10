import type { Clearance, FurnitureSymbol } from "@/catalog/furniture";
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

/** 가구 로컬 좌표(중심 원점, 회전 0) → 도면 좌표 */
export function toWorld(item: Pick<FurnitureItem, "x" | "y" | "rotation">, p: Vec2): Vec2 {
  const r = (item.rotation * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  return { x: item.x + p.x * cos - p.y * sin, y: item.y + p.x * sin + p.y * cos };
}

function localRect(x0: number, y0: number, x1: number, y1: number): Vec2[] {
  return [
    { x: x0, y: y0 },
    { x: x1, y: y0 },
    { x: x1, y: y1 },
    { x: x0, y: y1 },
  ];
}

/** 가구가 실제로 차지하는 바닥 모양을 볼록 조각들로 (ㄱ자는 두 조각, 원형은 16각형) */
export function itemParts(item: Placement, symbol: FurnitureSymbol): Vec2[][] {
  const w = item.width / 2;
  const d = item.depth / 2;
  let local: Vec2[][];
  if (symbol === "l-shape") {
    const a = Math.min(600, item.width * 0.45, item.depth * 0.45);
    local = [localRect(-w, -d, w, -d + a), localRect(-w, -d + a, -w + a, d)];
  } else if (symbol === "round") {
    local = [
      Array.from({ length: 16 }, (_, i) => {
        const t = (i / 16) * Math.PI * 2;
        return { x: Math.cos(t) * w, y: Math.sin(t) * d };
      }),
    ];
  } else {
    local = [localRect(-w, -d, w, d)];
  }
  return local.map((part) => part.map((p) => toWorld(item, p)));
}

export type ClearanceZone = {
  side: "front" | "back" | "left" | "right";
  size: number;
  polygon: Vec2[];
};

/** 가구 둘레에 비워 둬야 하는 영역들 */
export function clearanceZones(item: Placement, c: Clearance | undefined): ClearanceZone[] {
  if (!c) return [];
  const w = item.width / 2;
  const d = item.depth / 2;
  const zones: ClearanceZone[] = [];
  const add = (side: ClearanceZone["side"], size: number, rect: Vec2[]) =>
    zones.push({ side, size, polygon: rect.map((p) => toWorld(item, p)) });
  if (c.front) add("front", c.front, localRect(-w, d, w, d + c.front));
  if (c.back) add("back", c.back, localRect(-w, -d - c.back, w, -d));
  if (c.side) {
    add("left", c.side, localRect(-w - c.side, -d, -w, d));
    add("right", c.side, localRect(w, -d, w + c.side, d));
  }
  return zones;
}

/** 크기 조절 손잡이 위치. 로컬 좌표에서 -1(왼쪽/위) · 0(가운데) · 1(오른쪽/아래) */
export type ResizeHandle = { sx: -1 | 0 | 1; sy: -1 | 0 | 1 };

export const RESIZE_HANDLES: ResizeHandle[] = [
  { sx: -1, sy: -1 },
  { sx: 0, sy: -1 },
  { sx: 1, sy: -1 },
  { sx: 1, sy: 0 },
  { sx: 1, sy: 1 },
  { sx: 0, sy: 1 },
  { sx: -1, sy: 1 },
  { sx: -1, sy: 0 },
];

/** 가구 가로·깊이의 최소값 (속성 패널과 같은 값) */
export const MIN_ITEM_WIDTH = 50;
export const MIN_ITEM_DEPTH = 20;

export type ResizeResult = {
  patch: Pick<FurnitureItem, "x" | "y" | "width" | "depth">;
  guides: { x?: number; y?: number };
};

/**
 * 손잡이를 pointer(도면 좌표)까지 끌었을 때의 새 위치·크기.
 * 손잡이 반대쪽 변(모서리)은 제자리에 둔 채 늘이고, 회전된 가구도 가구 축을 따라 조절한다.
 * snap을 주면 움직이는 변이 threshold 안의 벽·가구 기준선에 붙는다
 * (기준선이 수평·수직뿐이라 가구가 90° 단위로 놓였을 때만).
 */
export function resizeItem(
  item: Placement,
  handle: ResizeHandle,
  pointer: Vec2,
  opts: { grid?: number; snap?: { lines: SnapLines; threshold: number } } = {},
): ResizeResult {
  const grid = opts.grid ?? 10;
  const r = (item.rotation * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  const dx = pointer.x - item.x;
  const dy = pointer.y - item.y;
  const p = { x: dx * cos + dy * sin, y: -dx * sin + dy * cos };
  const guides: ResizeResult["guides"] = {};

  /** 가구 로컬 축(도면 방향 dir)이 도면의 x·y축과 나란하면 그 축과 부호 */
  const worldAxis = (dir: Vec2) => {
    const EPS = 1e-6;
    if (Math.abs(Math.abs(dir.x) - 1) < EPS) return { key: "x" as const, sign: Math.sign(dir.x) };
    if (Math.abs(Math.abs(dir.y) - 1) < EPS) return { key: "y" as const, sign: Math.sign(dir.y) };
    return null;
  };

  const axis = (s: number, size: number, at: number, min: number, dir: Vec2) => {
    if (s === 0) return { size, center: 0 };
    const anchor = (-s * size) / 2;
    let next = Math.max(min, Math.round(((at - anchor) * s) / grid) * grid);

    const wa = opts.snap && worldAxis(dir);
    if (opts.snap && wa) {
      const origin = item[wa.key];
      const edgeWorld = origin + wa.sign * at;
      let best: number | null = null;
      for (const line of opts.snap.lines[wa.key === "x" ? "xs" : "ys"]) {
        const dist = Math.abs(line - edgeWorld);
        if (dist <= opts.snap.threshold && (best === null || dist < Math.abs(best - edgeWorld))) {
          best = line;
        }
      }
      if (best !== null) {
        const snapped = Math.round(((best - origin) * wa.sign - anchor) * s);
        if (snapped >= min) {
          next = snapped;
          guides[wa.key] = best;
        }
      }
    }
    return { size: next, center: anchor + (s * next) / 2 };
  };
  const ax = axis(handle.sx, item.width, p.x, MIN_ITEM_WIDTH, { x: cos, y: sin });
  const ay = axis(handle.sy, item.depth, p.y, MIN_ITEM_DEPTH, { x: -sin, y: cos });
  const c = toWorld(item, { x: ax.center, y: ay.center });
  return {
    patch: { x: Math.round(c.x), y: Math.round(c.y), width: ax.size, depth: ay.size },
    guides,
  };
}
