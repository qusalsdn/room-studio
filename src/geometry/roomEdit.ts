import type { Vec2 } from "@/domain/document";
import {
  EPS,
  add,
  distance,
  dot,
  edgeAt,
  edgeAxis,
  normalize,
  outwardNormal,
  roundPoint,
  scale,
  sub,
} from "@/geometry/polygon";

/**
 * 방 폴리곤 편집 연산. 모두 순수 함수이며 입력 배열을 바꾸지 않는다.
 * 드래그 중에는 드래그 시작 시점의 폴리곤(base)에 매번 다시 적용한다.
 */

export const MIN_EDGE = 100; // 10cm

export function rectPoints(x: number, y: number, w: number, h: number): Vec2[] {
  return [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h },
    { x, y: y + h },
  ];
}

export function translatePoints(points: Vec2[], delta: Vec2): Vec2[] {
  return points.map((p) => roundPoint(add(p, delta)));
}

/**
 * center를 기준으로 90° 회전. dir 1은 화면에서 시계방향(y축이 아래), -1은 반시계방향.
 * center가 정수면 결과도 정수 좌표로 남는다.
 */
export function rotatePoint90(p: Vec2, center: Vec2, dir: 1 | -1): Vec2 {
  const dx = p.x - center.x;
  const dy = p.y - center.y;
  return roundPoint({ x: center.x - dir * dy, y: center.y + dir * dx });
}

/**
 * 꼭짓점 이동. ortho가 켜져 있으면 이웃 꼭짓점도 함께 움직여서
 * 원래 수평/수직이던 변이 계속 수평/수직이 되게 한다.
 */
export function moveVertex(points: Vec2[], i: number, target: Vec2, ortho = true): Vec2[] {
  const n = points.length;
  const out = points.map((p) => ({ ...p }));
  const t = roundPoint(target);
  out[i] = t;
  if (ortho) {
    const prev = (i - 1 + n) % n;
    const next = (i + 1) % n;
    for (const k of [prev, next]) {
      if (k === i) continue;
      const axis = edgeAxis(points[k], points[i]);
      if (axis === "vertical") out[k] = { ...out[k], x: t.x };
      if (axis === "horizontal") out[k] = { ...out[k], y: t.y };
    }
  }
  return out;
}

/**
 * 변(벽)을 바깥 법선 방향으로 d만큼 평행 이동.
 * 이웃 변이 수직이면 그 변이 늘어나고, 평행하면 계단이 생기도록 꼭짓점을 끼워 넣는다.
 */
export function moveEdge(points: Vec2[], i: number, d: number): Vec2[] {
  const n = points.length;
  const ia = i;
  const ib = (i + 1) % n;
  const [a, b] = edgeAt(points, i);
  const offset = scale(outwardNormal(points, i), d);
  const dir = normalize(sub(b, a));
  const prevDir = normalize(sub(a, points[(ia - 1 + n) % n]));
  const nextDir = normalize(sub(points[(ib + 1) % n], b));
  const insertA = Math.abs(dot(dir, prevDir)) > 0.01;
  const insertB = Math.abs(dot(dir, nextDir)) > 0.01;
  const newA = roundPoint(add(a, offset));
  const newB = roundPoint(add(b, offset));

  const out: Vec2[] = [];
  for (let k = 0; k < n; k++) {
    if (k === ia) {
      if (insertA) out.push({ ...a });
      out.push(newA);
    } else if (k === ib) {
      out.push(newB);
      if (insertB) out.push({ ...b });
    } else {
      out.push({ ...points[k] });
    }
  }
  return removeDuplicatePoints(out);
}

/**
 * 변 길이를 지정값으로 바꾼다.
 * 수평/수직 변이면 끝점을 지나는 절단선 너머의 꼭짓점을 모두 밀어서 직각을 유지한다
 * (사각형의 윗변을 늘리면 아랫변도 같이 늘어남). 기울어진 변은 끝점만 옮긴다.
 */
export function setEdgeLength(points: Vec2[], i: number, newLength: number): Vec2[] {
  const [a, b] = edgeAt(points, i);
  const delta = newLength - distance(a, b);
  const axis = edgeAxis(a, b);
  if (axis === "horizontal") {
    const forward = b.x > a.x;
    return points.map((p) =>
      (forward ? p.x >= b.x - EPS : p.x <= b.x + EPS)
        ? { ...p, x: Math.round(p.x + (forward ? delta : -delta)) }
        : { ...p },
    );
  }
  if (axis === "vertical") {
    const forward = b.y > a.y;
    return points.map((p) =>
      (forward ? p.y >= b.y - EPS : p.y <= b.y + EPS)
        ? { ...p, y: Math.round(p.y + (forward ? delta : -delta)) }
        : { ...p },
    );
  }
  const dir = normalize(sub(b, a));
  const ib = (i + 1) % points.length;
  return points.map((p, k) => (k === ib ? roundPoint(add(b, scale(dir, delta))) : { ...p }));
}

/** 변 위의 점 at에 꼭짓점을 추가한다 */
export function splitEdge(points: Vec2[], i: number, at: Vec2): Vec2[] {
  const out = points.map((p) => ({ ...p }));
  out.splice(i + 1, 0, roundPoint(at));
  return out;
}

export function removeVertex(points: Vec2[], i: number): Vec2[] {
  if (points.length <= 3) return points;
  return points.filter((_, k) => k !== i).map((p) => ({ ...p }));
}

/** 이웃한 꼭짓점이 겹치면 하나로 합친다 */
export function removeDuplicatePoints(points: Vec2[]): Vec2[] {
  const out: Vec2[] = [];
  for (const p of points) {
    const last = out[out.length - 1];
    if (!last || distance(last, p) >= EPS) out.push(p);
  }
  while (out.length > 1 && distance(out[0], out[out.length - 1]) < EPS) out.pop();
  return out;
}

/** 일직선 위에 놓인 불필요한 꼭짓점 제거 */
export function removeCollinearPoints(points: Vec2[]): Vec2[] {
  let out = removeDuplicatePoints(points);
  let changed = true;
  while (changed && out.length > 3) {
    changed = false;
    for (let k = 0; k < out.length; k++) {
      const p = out[(k - 1 + out.length) % out.length];
      const c = out[k];
      const q = out[(k + 1) % out.length];
      const d1 = normalize(sub(c, p));
      const d2 = normalize(sub(q, c));
      if (dot(d1, d2) > 0.9999) {
        out = out.filter((_, j) => j !== k);
        changed = true;
        break;
      }
    }
  }
  return out;
}
