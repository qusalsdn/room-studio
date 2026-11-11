import type { FurnitureItem, Opening, Room, Vec2 } from "@/domain/document";
import { partsOverlap } from "@/geometry/collision";
import { itemParts, normalizeAngle } from "@/geometry/furniture";
import { openingGeometry } from "@/geometry/openings";
import { add, distance, dot, scale, sub } from "@/geometry/polygon";

/**
 * 자동 배치에서 "보기 좋은 배치"를 점수로 매기는 규칙들.
 * 비용(작을수록 좋음)의 단위는 자동 배치의 이동 비용과 같다: 1m 옮기기 = 100.
 * 규칙은 이미 놓인 가구(placed)와 지금 놓으려는 가구 사이에서만 따진다.
 */

type Pose = Pick<FurnitureItem, "x" | "y" | "rotation" | "width" | "depth" | "catalogId">;
export type Target = { x: number; y: number; rotation: number };

const SOFAS = new Set(["sofa-1", "sofa-2", "sofa-3"]);
const TVS = new Set(["tv", "tv-stand"]);
const CHAIRS = new Set(["chair", "office-chair"]);
const DESKS = new Set(["desk", "computer-desk", "l-desk"]);
const BEDS = new Set(["bed-single", "bed-super-single", "bed-queen", "bed-king"]);

/** TV 화면과 소파 앞면 사이 권장 거리 */
const VIEW_MIN = 1500;
const VIEW_MAX = 3000;
/** 소파 앞면과 거실 테이블 사이 */
const COFFEE_GAP = 400;
/** 문 앞에서 침대를 피하는 깊이 */
const DOOR_LINE = 1500;

/** 가구 앞(로컬 +y) · 오른쪽(로컬 +x) 방향 */
function front(p: Pose): Vec2 {
  const r = (p.rotation * Math.PI) / 180;
  return { x: -Math.sin(r), y: Math.cos(r) };
}
function right(p: Pose): Vec2 {
  const r = (p.rotation * Math.PI) / 180;
  return { x: Math.cos(r), y: Math.sin(r) };
}

function angleDiff(a: number, b: number): number {
  const d = Math.abs(normalizeAngle(a) - normalizeAngle(b));
  return Math.min(d, 360 - d);
}

function target(p: Vec2, rotation: number): Target {
  return { x: Math.round(p.x), y: Math.round(p.y), rotation: normalizeAngle(Math.round(rotation)) };
}

/** 의자를 놓을 자리들 (탁자 쪽을 바라보도록) */
function seatsOf(table: Pose, chair: Pose): Target[] {
  const f = front(table);
  const rt = right(table);
  const off = (table.depth + chair.depth) / 2;
  const frontSeat = (dx: number) =>
    target(add(add(table, scale(f, off)), scale(rt, dx)), table.rotation + 180);
  const backSeat = (dx: number) =>
    target(add(sub(table, scale(f, off)), scale(rt, dx)), table.rotation);
  switch (table.catalogId) {
    case "desk":
    case "computer-desk":
    case "vanity":
    case "table":
      return [frontSeat(0)];
    case "dining-4":
      return [-1, 1].flatMap((k) => [
        frontSeat((k * table.width) / 4),
        backSeat((k * table.width) / 4),
      ]);
    case "dining-6":
      return [-1, 0, 1].flatMap((k) => [
        frontSeat((k * table.width) / 3),
        backSeat((k * table.width) / 3),
      ]);
    case "table-round": {
      const side = (table.width + chair.depth) / 2;
      return [
        frontSeat(0),
        backSeat(0),
        target(add(table, scale(rt, side)), table.rotation + 90),
        target(sub(table, scale(rt, side)), table.rotation - 90),
      ];
    }
    default:
      return [];
  }
}

/** 침대 머리맡 양옆 협탁 자리 */
function nightstandSpots(bed: Pose, ns: Pose): Target[] {
  const back = scale(front(bed), -(bed.depth - ns.depth) / 2);
  return [-1, 1].map((k) =>
    target(add(add(bed, back), scale(right(bed), (k * (bed.width + ns.width)) / 2)), bed.rotation),
  );
}

function coffeeSpot(sofa: Pose, table: Pose): Target {
  const off = sofa.depth / 2 + COFFEE_GAP + table.depth / 2;
  return target(add(sofa, scale(front(sofa), off)), sofa.rotation);
}

/** 이 가구를 놓아 볼 만한 자리 (다른 가구와의 관계에서 나온 것) */
export function ruleTargets(item: Pose, placed: Pose[]): Target[] {
  const id = item.catalogId;
  if (CHAIRS.has(id)) return freeSeats(item, placed);
  if (id === "coffee-table")
    return placed.filter((p) => SOFAS.has(p.catalogId)).map((s) => coffeeSpot(s, item));
  if (id === "nightstand")
    return placed.filter((p) => BEDS.has(p.catalogId)).flatMap((b) => nightstandSpots(b, item));
  return [];
}

/** 소파가 TV를 마주 보고, 적당한 거리에 있는지 */
function sofaTvCost(sofa: Pose, tv: Pose): number {
  const v = sub(tv, sofa);
  const d = Math.hypot(v.x, v.y) || 1;
  const dir = scale(v, 1 / d);
  const sofaFacing = dot(front(sofa), dir);
  const tvFacing = -dot(front(tv), dir);
  const gap = d - sofa.depth / 2 - tv.depth / 2;
  const range = gap < VIEW_MIN ? VIEW_MIN - gap : gap > VIEW_MAX ? gap - VIEW_MAX : 0;
  return (1 - sofaFacing) * 2000 + (1 - tvFacing) * 800 + range / 2;
}

/** 위치가 target에서 얼마나 벗어났는지 */
function offTarget(p: Pose, t: Target, turnCost = 100): number {
  return distance(p, t) / 2 + (angleDiff(p.rotation, t.rotation) / 90) * turnCost;
}

/** 의자 자리 중 이미 다른 의자가 앉은 곳은 뺀다 */
function freeSeats(item: Pose, placed: Pose[]): Target[] {
  const chairs = placed.filter((p) => CHAIRS.has(p.catalogId));
  return placed
    .flatMap((t) => seatsOf(t, item))
    .filter((s) => !chairs.some((c) => distance(c, s) < 250));
}

function doorLines(room: Room, openings: Opening[]): Vec2[][] {
  return openings
    .filter((o) => o.roomId === room.id && o.kind !== "window")
    .map((o) => {
      const g = openingGeometry(room.points, o);
      const inward = scale(g.normal, -DOOR_LINE);
      return [g.start, g.end, add(g.end, inward), add(g.start, inward)];
    });
}

function windowCenters(room: Room, openings: Opening[]): Vec2[] {
  return openings
    .filter((o) => o.roomId === room.id && o.kind === "window")
    .map((o) => openingGeometry(room.points, o).center);
}

export type RuleContext = {
  room: Room;
  openings: Opening[];
  placed: Pose[];
  /** 아직 놓지 않은 짝 가구(소파·TV)가 갈 수 있는 자리들 */
  pending?: Pose[];
};

/** 짝이 아직 안 놓였을 때 미리 내다볼 가구 (pending으로 넘긴다) */
export function needsLookahead(catalogId: string): boolean {
  return SOFAS.has(catalogId) || TVS.has(catalogId);
}

/** 이 자리에 놓았을 때 규칙 비용 (0이 가장 좋음) */
export function ruleCost(item: Pose, ctx: RuleContext): number {
  const { placed } = ctx;
  const id = item.catalogId;
  let cost = 0;

  // 소파 ↔ TV. 짝이 아직 안 놓였으면 짝이 갈 수 있는 자리 중 가장 좋은 곳을 가정한다
  if (SOFAS.has(id) || TVS.has(id)) {
    const partnerIds = SOFAS.has(id) ? TVS : SOFAS;
    let partners = placed.filter((p) => partnerIds.has(p.catalogId));
    if (!partners.length) partners = (ctx.pending ?? []).filter((p) => partnerIds.has(p.catalogId));
    if (partners.length) {
      cost += Math.min(
        ...partners.map((p) => (SOFAS.has(id) ? sofaTvCost(item, p) : sofaTvCost(p, item))),
      );
    }
  }

  // 거실 테이블은 소파 앞
  if (id === "coffee-table") {
    const spots = placed.filter((p) => SOFAS.has(p.catalogId)).map((s) => coffeeSpot(s, item));
    // 거실 테이블은 앞뒤가 없으므로 180° 돌아간 것도 같은 자리
    if (spots.length)
      cost += Math.min(
        ...spots.flatMap((t) => [
          offTarget(item, t),
          offTarget(item, { ...t, rotation: t.rotation + 180 }),
        ]),
      );
  }

  // 의자는 책상·식탁의 빈 자리
  if (CHAIRS.has(id)) {
    const seats = freeSeats(item, placed);
    if (seats.length) cost += Math.min(...seats.map((s) => offTarget(item, s)));
  }

  // 협탁은 침대 머리맡
  if (id === "nightstand") {
    const spots = placed
      .filter((p) => BEDS.has(p.catalogId))
      .flatMap((b) => nightstandSpots(b, item));
    if (spots.length) cost += Math.min(...spots.map((s) => offTarget(item, s)));
  }

  // 책상은 창가 (최대 3m 거리까지만 따진다)
  if (DESKS.has(id)) {
    const windows = windowCenters(ctx.room, ctx.openings);
    if (windows.length) cost += Math.min(600, ...windows.map((w) => distance(item, w) / 5));
  }

  // 침대는 문 정면을 피한다
  if (BEDS.has(id)) {
    const parts = itemParts(item, "bed");
    if (doorLines(ctx.room, ctx.openings).some((line) => partsOverlap(parts, [line], 10))) {
      cost += 400;
    }
  }

  return cost;
}
