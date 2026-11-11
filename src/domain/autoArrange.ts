import {
  findCatalogItem,
  placementOf as catalogPlacement,
  type Placement,
} from "@/catalog/furniture";
import { needsLookahead, ruleCost, ruleTargets } from "@/domain/arrangeRules";
import type { FurnitureItem, HouseDocument, Room } from "@/domain/document";
import { checkLayout, countBySeverity } from "@/domain/warnings";
import { partsInsidePolygon, partsOverlap, type Convex } from "@/geometry/collision";
import { itemParts, normalizeAngle } from "@/geometry/furniture";
import {
  add,
  bounds,
  centroid,
  distance,
  edgeAt,
  normalize,
  outwardNormal,
  pointInPolygon,
  scale,
  sub,
} from "@/geometry/polygon";

/**
 * 가구 자동 배치.
 * - 가구는 지금 있는 방 안에서만 옮긴다 (방 밖에 있으면 가장 가까운 방).
 * - 반드시: 겹침·벽에 걸침·문 막힘 오류를 새로 만들지 않는다.
 * - 되도록: 여유공간·통로 경고를 줄이고, 원래 자리·방향에서 덜 옮긴다.
 * - 벽에 붙이는 가구(침대·소파·수납·가전 등)는 등을 벽에 대고 놓는다.
 * - 배치 규칙(arrangeRules): 소파↔TV, 소파 앞 거실 테이블, 책상·식탁 의자, 침대 옆 협탁,
 *   창가 책상, 문 정면을 피하는 침대.
 * 방마다 큰 가구부터 하나씩 가장 좋은 자리에 놓는 탐욕적 배치를 여러 순서로 해 보고,
 * 가장 좋은 것을 가구 하나씩 다시 놓기로 다듬는다. 순서는 고정된 시드로 섞으므로
 * 같은 입력이면 항상 같은 결과가 나온다.
 */

export type ArrangeOptions = {
  /** 옮기지 않을 가구 */
  fixedIds?: string[];
  /** 이 방들의 가구만 옮긴다 (없으면 집 전체) */
  roomIds?: string[];
  /** false면 한 번의 탐욕적 배치만 한다 (다듬기 없음, 테스트·비교용) */
  refine?: boolean;
};

export type ArrangeResult = {
  items: FurnitureItem[];
  /** 오류 없이 놓을 자리를 못 찾아 원래 자리에 둔 가구 */
  unplaced: string[];
};

type Doc = Pick<HouseDocument, "floorplan" | "settings">;

/** 벽 쪽 후보 간격 · 방 안 격자 간격 (mm) */
const WALL_STEP = 100;
const GRID_STEP = 200;
/** 경고 하나 = 이만큼(mm/10) 더 옮기는 것과 같은 비용 */
const WARNING_COST = 1000;
/** 방향을 바꾸는 비용 (= 50cm 옮기는 것) */
const ROTATE_COST = 50;
/** 오류 하나 (오류는 새로 만들지 않으므로, 서로 다른 배치를 비교할 때만 쓰인다) */
const ERROR_COST = 100_000;
/** 가구 하나당 경고 검사를 돌려 볼 후보 수 상한 */
const MAX_EVALS = 400;
/** 탐욕적 배치를 몇 가지 순서로 해 볼지 · 다듬기를 최대 몇 바퀴 돌지 */
const STARTS = 6;
const MAX_PASSES = 4;

/** 자동 배치 방식. 바닥에 까는 얇은 가구는 옮기지 않는다 */
export function placementOf(item: FurnitureItem): Placement {
  if (item.height <= 20) return "keep";
  return catalogPlacement(item.catalogId);
}

function partsOf(item: FurnitureItem): Convex[] {
  return itemParts(item, findCatalogItem(item.catalogId)?.symbol ?? "plain");
}

/** 가구가 속한 방 (방 밖이면 가장 가까운 방) */
export function roomOf(item: FurnitureItem, rooms: Room[]): Room | undefined {
  const inside = rooms.find((r) => pointInPolygon(item, r.points));
  if (inside) return inside;
  let best: Room | undefined;
  let bestD = Infinity;
  for (const r of rooms) {
    const d = distance(item, centroid(r.points));
    if (d < bestD) {
      bestD = d;
      best = r;
    }
  }
  return best;
}

type Candidate = { x: number; y: number; rotation: number };

/** 등(로컬 -y)을 벽에 대는 자리들 */
function wallCandidates(item: FurnitureItem, room: Room): Candidate[] {
  const out: Candidate[] = [];
  const pts = room.points;
  for (let i = 0; i < pts.length; i++) {
    const [a, b] = edgeAt(pts, i);
    const len = distance(a, b);
    if (len < item.width) continue;
    const dir = normalize(sub(b, a));
    const n = outwardNormal(pts, i);
    // 로컬 -y를 회전하면 (sin r, -cos r). 이것이 바깥 법선 n과 같아지는 각
    const rotation = normalizeAngle(Math.round((Math.atan2(n.x, -n.y) * 180) / Math.PI));
    const ts: number[] = [];
    for (let t = item.width / 2; t <= len - item.width / 2; t += WALL_STEP) ts.push(t);
    ts.push(len - item.width / 2);
    // 지금 자리에서 벽으로 곧장 민 자리 (원래 자리를 최대한 살린다)
    const along = (item.x - a.x) * dir.x + (item.y - a.y) * dir.y;
    ts.push(Math.min(len - item.width / 2, Math.max(item.width / 2, along)));
    for (const t of ts) {
      const c = add(add(a, scale(dir, t)), scale(n, -item.depth / 2));
      out.push({ x: Math.round(c.x), y: Math.round(c.y), rotation });
    }
  }
  return out;
}

/** 방 안 격자 위 자리들 (네 방향) */
function freeCandidates(room: Room): Candidate[] {
  const out: Candidate[] = [];
  const b = bounds(room.points);
  const x0 = Math.ceil(b.minX / GRID_STEP) * GRID_STEP;
  const y0 = Math.ceil(b.minY / GRID_STEP) * GRID_STEP;
  for (let x = x0; x <= b.maxX; x += GRID_STEP) {
    for (let y = y0; y <= b.maxY; y += GRID_STEP) {
      if (!pointInPolygon({ x, y }, room.points)) continue;
      for (const rotation of [0, 90, 180, 270]) out.push({ x, y, rotation });
    }
  }
  return out;
}

/** 벽 가구는 벽에 붙은 자리만, 나머지는 지금 자리 + 방 안 격자 */
function baseCandidates(item: FurnitureItem, room: Room): Candidate[] {
  return placementOf(item) === "wall"
    ? wallCandidates(item, room)
    : [{ x: item.x, y: item.y, rotation: item.rotation }, ...freeCandidates(room)];
}

function rotationDiff(a: number, b: number): number {
  const d = Math.abs(normalizeAngle(a) - normalizeAngle(b));
  return Math.min(d, 360 - d);
}

export function autoArrange(
  doc: Doc,
  items: FurnitureItem[],
  options: ArrangeOptions = {},
): ArrangeResult {
  const rooms = doc.floorplan.rooms;
  const fixed = new Set(options.fixedIds ?? []);
  const scope = options.roomIds ? new Set(options.roomIds) : null;
  const result = new Map(items.map((i) => [i.id, i]));
  const unplaced: string[] = [];

  for (const room of rooms) {
    if (scope && !scope.has(room.id)) continue;
    const inRoom = items.filter((i) => roomOf(i, rooms)?.id === room.id);
    const movable = inRoom.filter((i) => !fixed.has(i.id) && placementOf(i) !== "keep");
    if (!movable.length) continue;
    const anchored = inRoom.filter((i) => !movable.includes(i));
    const best = arrangeRoom(doc, room, movable, anchored, options.refine ?? true);
    for (const item of best.items) result.set(item.id, item);
    unplaced.push(...best.unplaced);
  }

  return { items: items.map((i) => result.get(i.id)!), unplaced };
}

type RoomArrangement = { items: FurnitureItem[]; unplaced: string[]; score: number };

/**
 * 방 하나 배치: 순서를 바꿔 가며 여러 번 탐욕적으로 놓아 보고 가장 좋은 것을 고른 뒤,
 * 가구를 하나씩 빼서 다시 놓는 다듬기를 점수가 더 좋아지지 않을 때까지 되풀이한다.
 */
function arrangeRoom(
  doc: Doc,
  room: Room,
  movable: FurnitureItem[],
  anchored: FurnitureItem[],
  refine: boolean,
): RoomArrangement {
  const originals = new Map(movable.map((i) => [i.id, i]));
  const area = (i: FurnitureItem) => i.width * i.depth;
  // 벽 가구 먼저, 그다음 방 안 가구. 같은 묶음 안에서는 큰 것부터
  const groups = [
    movable.filter((i) => placementOf(i) === "wall"),
    movable.filter((i) => placementOf(i) !== "wall"),
  ].map((g) => [...g].sort((a, b) => area(b) - area(a) || a.id.localeCompare(b.id)));

  const orders = [groups.flat()];
  if (refine) {
    for (let seed = 1; seed < STARTS; seed++) {
      const rand = mulberry32(seed);
      orders.push(groups.flatMap((g) => shuffle(g, rand)));
    }
  }

  let best: RoomArrangement | null = null;
  for (const order of orders) {
    const placed = greedy(doc, room, order, anchored);
    const score = roomScore(doc, room, placed.items, anchored, originals);
    if (!best || score < best.score) best = { ...placed, score };
  }
  return refine ? refineRoom(doc, room, best!, anchored, originals) : best!;
}

/** order 순서대로 하나씩 가장 좋은 자리에 놓는다 */
function greedy(
  doc: Doc,
  room: Room,
  order: FurnitureItem[],
  anchored: FurnitureItem[],
): { items: FurnitureItem[]; unplaced: string[] } {
  const placed = [...anchored];
  const items: FurnitureItem[] = [];
  const unplaced: string[] = [];
  for (const [k, item] of order.entries()) {
    const pending = order
      .slice(k + 1)
      .filter((i) => needsLookahead(i.catalogId))
      .flatMap((i) => baseCandidates(i, room).map((c) => ({ ...i, ...c })));
    const best = placeOne(doc, room, item, placed, pending);
    const next = best ? { ...item, ...best } : item;
    if (!best) unplaced.push(item.id);
    placed.push(next);
    items.push(next);
  }
  return { items, unplaced };
}

/** 가구를 하나씩 빼서 나머지를 그대로 둔 채 다시 놓아 본다. 방 전체 점수가 좋아질 때만 받아들인다 */
function refineRoom(
  doc: Doc,
  room: Room,
  start: RoomArrangement,
  anchored: FurnitureItem[],
  originals: Map<string, FurnitureItem>,
): RoomArrangement {
  let current = start;
  for (let pass = 0; pass < MAX_PASSES; pass++) {
    let improved = false;
    for (const id of current.items.map((i) => i.id)) {
      const others = current.items.filter((i) => i.id !== id);
      const original = originals.get(id)!;
      const spot = placeOne(doc, room, original, [...anchored, ...others], []);
      if (!spot) continue;
      const items = current.items.map((i) => (i.id === id ? { ...original, ...spot } : i));
      const score = roomScore(doc, room, items, anchored, originals);
      if (score < current.score - 1e-6) {
        current = { items, unplaced: current.unplaced.filter((u) => u !== id), score };
        improved = true;
      }
    }
    if (!improved) break;
  }
  return current;
}

/** 방 전체 배치의 비용 (작을수록 좋음): 오류·경고 + 옮긴 거리·방향 + 배치 규칙 */
function roomScore(
  doc: Doc,
  room: Room,
  items: FurnitureItem[],
  anchored: FurnitureItem[],
  originals: Map<string, FurnitureItem>,
): number {
  const all = [...anchored, ...items];
  const { error, warning } = countBySeverity(checkLayout(doc, all));
  let cost = error * ERROR_COST + warning * WARNING_COST;
  for (const item of items) {
    const o = originals.get(item.id)!;
    cost += distance(item, o) / 10 + (rotationDiff(item.rotation, o.rotation) ? ROTATE_COST : 0);
    const placed = all.filter((i) => i.id !== item.id);
    cost += ruleCost(item, { room, openings: doc.floorplan.openings, placed });
  }
  return cost;
}

/** 시드로 정해지는 난수 (같은 입력이면 같은 결과가 나오도록) */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(list: T[], rand: () => number): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** placed 사이에 item을 놓을 가장 좋은 자리. 오류 없이 놓을 곳이 없으면 null */
function placeOne(
  doc: Doc,
  room: Room,
  item: FurnitureItem,
  placed: FurnitureItem[],
  pending: FurnitureItem[],
): Candidate | null {
  const raw = [...baseCandidates(item, room), ...ruleTargets(item, placed)];
  const ctx = { room, openings: doc.floorplan.openings, placed, pending };
  // 이동 비용 + 규칙 비용은 경고 검사 없이 싸게 구할 수 있어서, 이것으로 정렬해 가지치기한다
  const lowerBound = (c: Candidate) =>
    distance(c, item) / 10 +
    (rotationDiff(c.rotation, item.rotation) ? ROTATE_COST : 0) +
    ruleCost({ ...item, ...c }, ctx);
  const candidates = raw.map((c) => ({ c, lb: lowerBound(c) })).sort((a, b) => a.lb - b.lb);

  const solids = placed.filter((p) => placementOf(p) !== "keep");
  const solidParts = solids.map(partsOf);
  const base = countBySeverity(checkLayout(doc, placed));

  let best: Candidate | null = null;
  let bestCost = Infinity;
  let evals = 0;
  for (const { c, lb } of candidates) {
    if (lb >= bestCost || evals >= MAX_EVALS) break;
    const moved = { ...item, ...c };
    const parts = partsOf(moved);
    // 싼 검사 먼저: 방 안에 들어가고 다른 가구와 겹치지 않는지
    if (!partsInsidePolygon(parts, room.points)) continue;
    if (solidParts.some((p) => partsOverlap(parts, p))) continue;
    evals++;
    const after = countBySeverity(checkLayout(doc, [...placed, moved]));
    if (after.error > base.error) continue;
    const cost = lb + Math.max(0, after.warning - base.warning) * WARNING_COST;
    if (cost < bestCost) {
      bestCost = cost;
      best = c;
    }
  }
  return best;
}
