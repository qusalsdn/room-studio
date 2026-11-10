import type { Vec2 } from "@/domain/document";
import {
  closestPointOnSegment,
  distance,
  dot,
  pointInPolygon,
  segmentsIntersect,
  sub,
} from "@/geometry/polygon";

/** 볼록 다각형 하나. 오목한 모양(ㄱ자)은 볼록 조각 여러 개로 나눠 다룬다 */
export type Convex = Vec2[];

function project(poly: Convex, axis: Vec2): [number, number] {
  let min = Infinity;
  let max = -Infinity;
  for (const p of poly) {
    const v = dot(p, axis);
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return [min, max];
}

function axesOf(poly: Convex): Vec2[] {
  return poly.map((p, i) => {
    const q = poly[(i + 1) % poly.length];
    const e = sub(q, p);
    const len = Math.hypot(e.x, e.y) || 1;
    return { x: -e.y / len, y: e.x / len };
  });
}

/**
 * 분리축 정리(SAT). 모든 축에서 tolerance(mm)보다 깊게 겹쳐야 겹친 것으로 본다.
 * 그래서 딱 맞닿은 가구(벽·옆 가구에 붙여 놓은 것)는 겹침이 아니다.
 */
export function convexOverlap(a: Convex, b: Convex, tolerance = 5): boolean {
  for (const axis of [...axesOf(a), ...axesOf(b)]) {
    const [aMin, aMax] = project(a, axis);
    const [bMin, bMax] = project(b, axis);
    if (Math.min(aMax, bMax) - Math.max(aMin, bMin) <= tolerance) return false;
  }
  return true;
}

export function partsOverlap(a: Convex[], b: Convex[], tolerance = 5): boolean {
  return a.some((pa) => b.some((pb) => convexOverlap(pa, pb, tolerance)));
}

export type ClosestPair = { distance: number; a: Vec2; b: Vec2 };

/** 겹치지 않는 두 다각형 사이 최단 거리와 그 두 점 */
export function polygonDistance(a: Vec2[], b: Vec2[]): ClosestPair {
  let best: ClosestPair = { distance: Infinity, a: a[0], b: b[0] };
  const check = (p: Vec2, poly: Vec2[], pIsA: boolean) => {
    for (let i = 0; i < poly.length; i++) {
      const q = closestPointOnSegment(p, poly[i], poly[(i + 1) % poly.length]);
      const d = distance(p, q);
      if (d < best.distance)
        best = pIsA ? { distance: d, a: p, b: q } : { distance: d, a: q, b: p };
    }
  };
  for (const p of a) check(p, b, true);
  for (const p of b) check(p, a, false);
  return best;
}

/** 선분과 다각형 사이 최단 거리 */
export function segmentPolygonDistance(s0: Vec2, s1: Vec2, poly: Vec2[]): ClosestPair {
  return polygonDistance([s0, s1], poly);
}

/** 중심 쪽으로 amount만큼 줄인 다각형 (경계에 딱 붙은 경우를 "안쪽"으로 보기 위해) */
export function shrink(poly: Convex, amount: number): Convex {
  const c = poly.reduce(
    (acc, p) => ({ x: acc.x + p.x / poly.length, y: acc.y + p.y / poly.length }),
    {
      x: 0,
      y: 0,
    },
  );
  return poly.map((p) => {
    const d = distance(p, c);
    if (d <= amount) return c;
    const t = (d - amount) / d;
    return { x: c.x + (p.x - c.x) * t, y: c.y + (p.y - c.y) * t };
  });
}

/** 볼록 조각들이 다각형(방) 안에 완전히 들어 있는지 (경계에 붙은 것은 안쪽으로 봄) */
export function partsInsidePolygon(parts: Convex[], polygon: Vec2[]): boolean {
  return parts.every((part) => {
    const inner = shrink(part, 5);
    if (!inner.every((p) => pointInPolygon(p, polygon))) return false;
    // 오목한 방에서는 꼭짓점이 모두 안쪽이어도 벽이 가로지를 수 있다
    for (let i = 0; i < polygon.length; i++) {
      const w0 = polygon[i];
      const w1 = polygon[(i + 1) % polygon.length];
      for (let j = 0; j < inner.length; j++) {
        if (segmentsIntersect(w0, w1, inner[j], inner[(j + 1) % inner.length])) return false;
      }
    }
    return true;
  });
}
