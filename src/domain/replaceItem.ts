import { ruleCost } from "@/domain/arrangeRules";
import { roomOf, placementOf } from "@/domain/autoArrange";
import type { FurnitureItem, HouseDocument, Vec2 } from "@/domain/document";
import { checkLayout } from "@/domain/warnings";
import { polygonDistance } from "@/geometry/collision";
import { itemCorners, toWorld } from "@/geometry/furniture";
import { edgeAt } from "@/geometry/polygon";

/**
 * 가구 교체: 같은 자리에 다른 가구를 넣는다.
 * 가운데를 그대로 두면 깊이가 다른 가구가 벽을 뚫거나 벽에서 뜨므로,
 * 벽·다른 가구에 붙어 있던 면(등, 왼쪽, 오른쪽)을 그대로 두고 반대쪽으로 늘이거나 줄인다.
 * 가구 id는 그대로 둬서 비교 화면에서 같은 가구로 본다.
 */

type Doc = Pick<HouseDocument, "floorplan" | "settings">;

export type ReplaceSpec = Pick<
  FurnitureItem,
  "catalogId" | "name" | "width" | "depth" | "height" | "color"
>;

export type ReplaceResult = {
  item: FurnitureItem;
  /** 새로 생긴 오류·경고 없이 들어감 */
  fits: boolean;
  /** 교체해서 새로 생긴 문제 (도면의 "확인할 점" 문구) */
  problems: string[];
  /** 교체 때문에 자리가 어색해진 짝 가구 (책상 의자, 소파 앞 테이블, 침대 협탁 등) */
  related: string[];
};

/** 짝 가구의 규칙 비용이 이만큼 넘게 나빠지면 다시 놓아 보라고 알린다 (1m 옮기기 = 100) */
const RELATED_WORSE = 60;

/** 이만큼 가까우면 붙어 있는 것으로 본다 (mm) */
const FLUSH = 20;

type Side = "back" | "left" | "right";

/** 가구의 한 면(선분)이 벽이나 다른 가구에 붙어 있는지 */
function sideIsFlush(
  item: FurnitureItem,
  side: Side,
  walls: [Vec2, Vec2][],
  others: FurnitureItem[],
): boolean {
  const w = item.width / 2;
  const d = item.depth / 2;
  const local: [Vec2, Vec2] =
    side === "back"
      ? [
          { x: -w, y: -d },
          { x: w, y: -d },
        ]
      : side === "left"
        ? [
            { x: -w, y: -d },
            { x: -w, y: d },
          ]
        : [
            { x: w, y: -d },
            { x: w, y: d },
          ];
  // 모서리끼리만 닿은 것은 붙은 것으로 보지 않도록 변을 조금 줄여서 잰다
  const inset = (p: Vec2, q: Vec2): [Vec2, Vec2] => {
    const t = 0.1;
    return [
      { x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t },
      { x: q.x + (p.x - q.x) * t, y: q.y + (p.y - q.y) * t },
    ];
  };
  const [a, b] = inset(...local);
  const seg = [toWorld(item, a), toWorld(item, b)];
  if (walls.some((wall) => polygonDistance(seg, wall).distance < FLUSH)) return true;
  return others.some((o) => polygonDistance(seg, itemCorners(o)).distance < FLUSH);
}

/** 붙어 있던 면을 기준으로 새 크기의 가구가 놓일 자리 */
export function anchoredPlacement(
  doc: Doc,
  items: FurnitureItem[],
  item: FurnitureItem,
  spec: Pick<FurnitureItem, "width" | "depth">,
): Vec2 {
  const room = roomOf(item, doc.floorplan.rooms);
  const walls = room ? room.points.map((_, i) => edgeAt(room.points, i)) : [];
  const others = items.filter((i) => i.id !== item.id && placementOf(i) !== "keep");
  const flush = (side: Side) => sideIsFlush(item, side, walls, others);

  const dw = spec.width - item.width;
  const dd = spec.depth - item.depth;
  // 로컬 좌표에서 가운데를 얼마나 옮길지: 붙은 면은 그대로, 반대쪽으로 늘어난다
  const left = flush("left");
  const right = flush("right");
  const shift = {
    x: left && !right ? dw / 2 : right && !left ? -dw / 2 : 0,
    y: flush("back") ? dd / 2 : 0,
  };
  const c = toWorld(item, shift);
  return { x: Math.round(c.x), y: Math.round(c.y) };
}

export function replaceItem(
  doc: Doc,
  items: FurnitureItem[],
  itemId: string,
  spec: ReplaceSpec,
): ReplaceResult | null {
  const old = items.find((i) => i.id === itemId);
  if (!old) return null;
  const at = anchoredPlacement(doc, items, old, spec);
  const item: FurnitureItem = { ...old, ...spec, ...at };

  const others = items.filter((i) => i.id !== itemId);
  const mine = (list: FurnitureItem[]) =>
    checkLayout(doc, list).filter((w) => w.itemIds.includes(itemId));
  const before = new Set(mine([...others, old]).map((w) => w.kind + w.itemIds.join()));
  // 교체 전에도 있던 문제(같은 종류, 같은 상대)는 새 문제로 치지 않는다
  const problems = mine([...others, item]).filter((w) => !before.has(w.kind + w.itemIds.join()));
  return {
    item,
    fits: problems.length === 0,
    problems: problems.map((w) => w.message),
    related: relatedAfterReplace(doc, items, old, item),
  };
}

/** 같은 방의 다른 가구 중 교체 뒤에 규칙 비용이 크게 나빠진 것 */
function relatedAfterReplace(
  doc: Doc,
  items: FurnitureItem[],
  old: FurnitureItem,
  next: FurnitureItem,
): string[] {
  const rooms = doc.floorplan.rooms;
  const room = roomOf(old, rooms);
  if (!room) return [];
  const inRoom = items.filter((i) => roomOf(i, rooms)?.id === room.id);
  const costWith = (target: FurnitureItem, replaced: FurnitureItem) =>
    ruleCost(target, {
      room,
      openings: doc.floorplan.openings,
      placed: inRoom.filter((i) => i.id !== target.id).map((i) => (i.id === old.id ? replaced : i)),
    });
  return inRoom
    .filter((i) => i.id !== old.id)
    .filter((i) => costWith(i, next) - costWith(i, old) > RELATED_WORSE)
    .map((i) => i.id);
}
