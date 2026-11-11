import type { FurnitureItem, Layout } from "@/domain/document";

/** 이만큼 이하로 움직였으면 "그대로"로 본다 (mm, 도) */
const MOVE_EPS = 20;
const ROTATE_EPS = 1;

export type MovedItem = {
  id: string;
  name: string;
  from: FurnitureItem;
  to: FurnitureItem;
  /** 중심 이동 거리 (mm) */
  distance: number;
  rotated: boolean;
  resized: boolean;
  /** 다른 가구로 교체됨 (카탈로그 종류가 바뀜) */
  replaced: boolean;
  /** 같은 종류인데 이름만 바뀜 (직접 만든 가구를 다른 것으로 바꾼 경우 포함) */
  renamed: boolean;
};

export type LayoutDiff = {
  moved: MovedItem[];
  /** B에만 있는 가구 */
  added: FurnitureItem[];
  /** A에만 있는 가구 */
  removed: FurnitureItem[];
  unchanged: FurnitureItem[];
};

function angleDelta(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return Math.min(d, 360 - d);
}

/**
 * 두 배치안의 차이. 배치안을 복제하면 가구 id가 그대로 이어지므로 id로 같은 가구를 찾는다.
 */
export function diffLayouts(a: Pick<Layout, "items">, b: Pick<Layout, "items">): LayoutDiff {
  const byIdA = new Map(a.items.map((i) => [i.id, i]));
  const byIdB = new Map(b.items.map((i) => [i.id, i]));
  const diff: LayoutDiff = { moved: [], added: [], removed: [], unchanged: [] };

  for (const to of b.items) {
    const from = byIdA.get(to.id);
    if (!from) {
      diff.added.push(to);
      continue;
    }
    const distance = Math.hypot(to.x - from.x, to.y - from.y);
    const rotated = angleDelta(from.rotation, to.rotation) > ROTATE_EPS;
    const resized = from.width !== to.width || from.depth !== to.depth;
    const replaced = from.catalogId !== to.catalogId;
    const renamed = !replaced && from.name !== to.name;
    if (distance > MOVE_EPS || rotated || resized || replaced || renamed) {
      diff.moved.push({
        id: to.id,
        name: to.name,
        from,
        to,
        distance,
        rotated,
        resized,
        replaced,
        renamed,
      });
    } else {
      diff.unchanged.push(to);
    }
  }
  for (const from of a.items) {
    if (!byIdB.has(from.id)) diff.removed.push(from);
  }
  diff.moved.sort((x, y) => y.distance - x.distance);
  return diff;
}

/** "배치안 A", "배치안 B"… 중 아직 안 쓴 이름 */
export function nextLayoutName(existing: string[]): string {
  const used = new Set(existing);
  for (let i = 0; i < 26; i++) {
    const name = `배치안 ${String.fromCharCode(65 + i)}`;
    if (!used.has(name)) return name;
  }
  return `배치안 ${existing.length + 1}`;
}
