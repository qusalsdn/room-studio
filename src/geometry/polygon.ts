import type { Vec2 } from "@/domain/document";

export const EPS = 0.5; // mm

export function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function scale(a: Vec2, s: number): Vec2 {
  return { x: a.x * s, y: a.y * s };
}

export function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

export function cross(a: Vec2, b: Vec2): number {
  return a.x * b.y - a.y * b.x;
}

export function length(a: Vec2): number {
  return Math.hypot(a.x, a.y);
}

export function normalize(a: Vec2): Vec2 {
  const l = length(a);
  return l === 0 ? { x: 0, y: 0 } : { x: a.x / l, y: a.y / l };
}

export function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function snapValue(v: number, step: number): number {
  return Math.round(v / step) * step;
}

export function snapPoint(p: Vec2, step: number): Vec2 {
  return { x: snapValue(p.x, step), y: snapValue(p.y, step) };
}

export function roundPoint(p: Vec2): Vec2 {
  return { x: Math.round(p.x), y: Math.round(p.y) };
}

/** 슈레이스 공식. 좌표계와 무관하게 부호는 점 순서에 따라 정해진다. */
export function signedArea(points: Vec2[]): number {
  let s = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    s += a.x * b.y - b.x * a.y;
  }
  return s / 2;
}

export function polygonArea(points: Vec2[]): number {
  return Math.abs(signedArea(points));
}

export function centroid(points: Vec2[]): Vec2 {
  const a = signedArea(points);
  if (Math.abs(a) < EPS) {
    const sum = points.reduce((acc, p) => add(acc, p), { x: 0, y: 0 });
    return scale(sum, 1 / points.length);
  }
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const q = points[(i + 1) % points.length];
    const f = p.x * q.y - q.x * p.y;
    cx += (p.x + q.x) * f;
    cy += (p.y + q.y) * f;
  }
  return { x: cx / (6 * a), y: cy / (6 * a) };
}

export type Bounds = { minX: number; minY: number; maxX: number; maxY: number };

export function bounds(points: Vec2[]): Bounds {
  return points.reduce(
    (b, p) => ({
      minX: Math.min(b.minX, p.x),
      minY: Math.min(b.minY, p.y),
      maxX: Math.max(b.maxX, p.x),
      maxY: Math.max(b.maxY, p.y),
    }),
    { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
  );
}

export function edgeAt(points: Vec2[], i: number): [Vec2, Vec2] {
  return [points[i], points[(i + 1) % points.length]];
}

export function edgeLength(points: Vec2[], i: number): number {
  const [a, b] = edgeAt(points, i);
  return distance(a, b);
}

export type Axis = "horizontal" | "vertical" | null;

export function edgeAxis(a: Vec2, b: Vec2): Axis {
  if (Math.abs(a.y - b.y) < EPS && Math.abs(a.x - b.x) >= EPS) return "horizontal";
  if (Math.abs(a.x - b.x) < EPS && Math.abs(a.y - b.y) >= EPS) return "vertical";
  return null;
}

/** 다각형 바깥쪽을 향하는 단위 법선 */
export function outwardNormal(points: Vec2[], i: number): Vec2 {
  const [a, b] = edgeAt(points, i);
  const d = normalize(sub(b, a));
  const sign = signedArea(points) >= 0 ? 1 : -1;
  return { x: sign * d.y + 0, y: -sign * d.x + 0 };
}

function lineIntersection(p: Vec2, r: Vec2, q: Vec2, s: Vec2): Vec2 | null {
  const denom = cross(r, s);
  if (Math.abs(denom) < 1e-9) return null;
  const t = cross(sub(q, p), s) / denom;
  return add(p, scale(r, t));
}

/** 각 변을 바깥 법선 방향으로 d만큼 밀어낸 다각형 (벽 바깥 면) */
export function offsetPolygon(points: Vec2[], d: number): Vec2[] {
  const n = points.length;
  return points.map((p, i) => {
    const prev = (i - 1 + n) % n;
    const n1 = outwardNormal(points, prev);
    const n2 = outwardNormal(points, i);
    const a1 = add(points[prev], scale(n1, d));
    const r1 = sub(p, points[prev]);
    const a2 = add(p, scale(n2, d));
    const r2 = sub(points[(i + 1) % n], p);
    const hit = lineIntersection(a1, r1, a2, r2);
    if (!hit || distance(hit, p) > Math.abs(d) * 4) return roundPoint(a2);
    return roundPoint(hit);
  });
}

function onSegment(p: Vec2, a: Vec2, b: Vec2): boolean {
  return (
    Math.min(a.x, b.x) - EPS <= p.x &&
    p.x <= Math.max(a.x, b.x) + EPS &&
    Math.min(a.y, b.y) - EPS <= p.y &&
    p.y <= Math.max(a.y, b.y) + EPS
  );
}

function orient(a: Vec2, b: Vec2, c: Vec2): number {
  const v = cross(sub(b, a), sub(c, a));
  if (Math.abs(v) < EPS) return 0;
  return v > 0 ? 1 : -1;
}

export function segmentsIntersect(a: Vec2, b: Vec2, c: Vec2, d: Vec2): boolean {
  const o1 = orient(a, b, c);
  const o2 = orient(a, b, d);
  const o3 = orient(c, d, a);
  const o4 = orient(c, d, b);
  if (o1 !== o2 && o3 !== o4) return true;
  if (o1 === 0 && onSegment(c, a, b)) return true;
  if (o2 === 0 && onSegment(d, a, b)) return true;
  if (o3 === 0 && onSegment(a, c, d)) return true;
  if (o4 === 0 && onSegment(b, c, d)) return true;
  return false;
}

/** 꼭짓점 3개 이상, 길이 0인 변 없음, 서로 이웃하지 않은 변끼리 교차 없음 */
export function isSimplePolygon(points: Vec2[]): boolean {
  const n = points.length;
  if (n < 3) return false;
  for (let i = 0; i < n; i++) {
    if (edgeLength(points, i) < EPS) return false;
  }
  for (let i = 0; i < n; i++) {
    const [a, b] = edgeAt(points, i);
    for (let j = i + 1; j < n; j++) {
      if (j === i || (j + 1) % n === i || (i + 1) % n === j) continue;
      const [c, d] = edgeAt(points, j);
      if (segmentsIntersect(a, b, c, d)) return false;
    }
  }
  return polygonArea(points) > EPS;
}

/** 선분 위에서 p에 가장 가까운 점 */
export function closestPointOnSegment(p: Vec2, a: Vec2, b: Vec2): Vec2 {
  const ab = sub(b, a);
  const l2 = dot(ab, ab);
  if (l2 === 0) return a;
  const t = Math.max(0, Math.min(1, dot(sub(p, a), ab) / l2));
  return add(a, scale(ab, t));
}

export function pointInPolygon(p: Vec2, points: Vec2[]): boolean {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i];
    const b = points[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}
