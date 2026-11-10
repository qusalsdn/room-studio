import type { Opening, Vec2 } from "@/domain/document";
import {
  add,
  closestPointOnSegment,
  distance,
  dot,
  edgeAt,
  normalize,
  outwardNormal,
  scale,
  sub,
} from "@/geometry/polygon";

export const MIN_OPENING_WIDTH = 300;

export const OPENING_DEFAULTS: Record<
  Opening["kind"],
  Pick<Opening, "width" | "height" | "sillHeight">
> = {
  "hinged-door": { width: 900, height: 2100, sillHeight: 0 },
  "sliding-door": { width: 1600, height: 2100, sillHeight: 0 },
  window: { width: 1200, height: 1200, sillHeight: 900 },
};

export const OPENING_LABELS: Record<Opening["kind"], string> = {
  "hinged-door": "여닫이문",
  "sliding-door": "미닫이문",
  window: "창문",
};

export type OpeningGeometry = {
  a: Vec2;
  b: Vec2;
  dir: Vec2;
  /** 방 바깥쪽 단위 법선 */
  normal: Vec2;
  edgeLength: number;
  start: Vec2;
  end: Vec2;
  center: Vec2;
};

export function openingGeometry(
  points: Vec2[],
  o: Pick<Opening, "edgeIndex" | "offset" | "width">,
) {
  const [a, b] = edgeAt(points, o.edgeIndex % points.length);
  const dir = normalize(sub(b, a));
  const start = add(a, scale(dir, o.offset));
  const end = add(start, scale(dir, o.width));
  return {
    a,
    b,
    dir,
    normal: outwardNormal(points, o.edgeIndex % points.length),
    edgeLength: distance(a, b),
    start,
    end,
    center: add(start, scale(dir, o.width / 2)),
  } satisfies OpeningGeometry;
}

export function clampOffset(edgeLength: number, width: number, offset: number): number {
  return Math.round(Math.max(0, Math.min(edgeLength - width, offset)));
}

/** 벽 위 한 점 p가 개구부 가운데가 되도록 하는 offset */
export function offsetForCenter(points: Vec2[], edgeIndex: number, width: number, p: Vec2) {
  const [a, b] = edgeAt(points, edgeIndex);
  const dir = normalize(sub(b, a));
  return clampOffset(distance(a, b), width, dot(sub(p, a), dir) - width / 2);
}

/**
 * 방 모양이 바뀐 뒤 문·창이 붙은 벽을 다시 찾는다.
 * 원래 가운데 위치에서 가장 가까운 평행한 벽에 붙이고, 벽이 너무 짧으면 폭을 줄이거나 제거한다.
 */
export function reattachOpenings(
  oldPoints: Vec2[],
  newPoints: Vec2[],
  openings: Opening[],
): Opening[] {
  const out: Opening[] = [];
  for (const o of openings) {
    const old = openingGeometry(oldPoints, o);
    let best: { index: number; dist: number } | null = null;
    newPoints.forEach((_, i) => {
      const [a, b] = edgeAt(newPoints, i);
      const dir = normalize(sub(b, a));
      if (Math.abs(dot(dir, old.dir)) < 0.99) return;
      const d = distance(old.center, closestPointOnSegment(old.center, a, b));
      if (!best || d < best.dist) best = { index: i, dist: d };
    });
    if (!best) continue;
    const { index } = best as { index: number; dist: number };
    const [a, b] = edgeAt(newPoints, index);
    const len = distance(a, b);
    if (len < MIN_OPENING_WIDTH) continue;
    const width = Math.min(o.width, Math.floor(len));
    out.push({
      ...o,
      edgeIndex: index,
      width,
      offset: offsetForCenter(newPoints, index, width, old.center),
    });
  }
  return out;
}

/** 여닫이문 문짝이 쓸고 지나가는 부채꼴 (문짝 끝 궤적을 n개 점으로 근사) */
export function doorSwing(
  points: Vec2[],
  o: Opening,
  wallThickness: number,
  segments = 16,
): { hinge: Vec2; leafEnd: Vec2; arc: Vec2[] } {
  const g = openingGeometry(points, o);
  const inward = o.swing.side === "in";
  // 방 안쪽으로 열리면 안쪽 벽면, 바깥으로 열리면 바깥 벽면에 경첩
  const face = inward ? { x: 0, y: 0 } : scale(g.normal, wallThickness);
  const hingeAtStart = o.swing.hinge === "start";
  const hinge = add(hingeAtStart ? g.start : g.end, face);
  const closed = add(hingeAtStart ? g.end : g.start, face); // 닫혔을 때 문짝 끝
  const open = add(hinge, scale(inward ? scale(g.normal, -1) : g.normal, o.width));
  const v0 = sub(closed, hinge);
  const v1 = sub(open, hinge);
  const a0 = Math.atan2(v0.y, v0.x);
  const a1 = Math.atan2(v1.y, v1.x);
  let delta = a1 - a0;
  while (delta > Math.PI) delta -= 2 * Math.PI;
  while (delta < -Math.PI) delta += 2 * Math.PI;
  const arc: Vec2[] = [];
  for (let k = 0; k <= segments; k++) {
    const t = a0 + (delta * k) / segments;
    arc.push({ x: hinge.x + Math.cos(t) * o.width, y: hinge.y + Math.sin(t) * o.width });
  }
  return { hinge, leafEnd: open, arc };
}
