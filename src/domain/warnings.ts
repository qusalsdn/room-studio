import { findCatalogItem, itemClearance } from "@/catalog/furniture";
import type { FurnitureItem, HouseDocument, Room, Vec2 } from "@/domain/document";
import {
  partsInsidePolygon,
  partsOverlap,
  polygonDistance,
  segmentPolygonDistance,
  type Convex,
} from "@/geometry/collision";
import { clearanceZones, itemParts } from "@/geometry/furniture";
import { doorSwing, openingGeometry, OPENING_LABELS } from "@/geometry/openings";
import { add, edgeAt, pointInPolygon, scale } from "@/geometry/polygon";

/**
 * 가구 배치 점검.
 * - error: 겹침, 벽 밖·벽에 걸침, 문이 열리는 자리를 막음
 * - warning: 가구를 쓰는 데 필요한 여유공간이 막힘, 지나다니기 좁은 통로
 */

export const DEFAULT_MIN_PASSAGE = 600;
/** 이보다 낮은 가구(거실 테이블 등)는 여유공간·통로를 막는 것으로 보지 않는다 */
const LOW_HEIGHT = 500;
/** 이보다 좁은 틈은 사람이 다니는 길이 아니라 "붙여 놓은 것"으로 본다 */
const MIN_GAP = 150;

export type WarningKind = "overlap" | "outside" | "door" | "clearance" | "passage";
export type Severity = "error" | "warning";

export type Warning = {
  id: string;
  kind: WarningKind;
  severity: Severity;
  itemIds: string[];
  message: string;
  /** 도면에 칠할 영역 (여유공간, 문 열림 범위) */
  zone?: Vec2[];
  /** 도면에 그릴 선 (좁은 통로 폭) */
  gap?: { a: Vec2; b: Vec2; distance: number };
};

type Body = {
  item: FurnitureItem;
  parts: Convex[];
  outline: Vec2[];
  /** 바닥에 까는 물건(러그)은 아무것도 막지 않는다 */
  flat: boolean;
  low: boolean;
  room: Room | undefined;
};

/** 탁자에 붙여 앉는 의자 (안마의자는 아님) */
const isSeat = (item: FurnitureItem) =>
  item.catalogId === "chair" || item.catalogId === "office-chair";
const isNightstand = (item: FurnitureItem) => item.catalogId === "nightstand";

const cm = (mm: number) => `${Math.round(mm / 10)}cm`;

function bodiesOf(items: FurnitureItem[], rooms: Room[]): Body[] {
  return items.map((item) => {
    const symbol = findCatalogItem(item.catalogId)?.symbol ?? "plain";
    const parts = itemParts(item, symbol);
    const outline = parts.length === 1 ? parts[0] : parts.flat();
    return {
      item,
      parts,
      outline,
      flat: symbol === "rug" || item.height <= 20,
      low: item.height < LOW_HEIGHT,
      room: rooms.find((r) => pointInPolygon(item, r.points)),
    };
  });
}

export function checkLayout(
  doc: Pick<HouseDocument, "floorplan" | "settings">,
  items: FurnitureItem[],
): Warning[] {
  const { rooms, openings } = doc.floorplan;
  const t = doc.settings.wallThickness;
  const minPassage = doc.settings.minPassage ?? DEFAULT_MIN_PASSAGE;
  const bodies = bodiesOf(items, rooms);
  const solid = bodies.filter((b) => !b.flat);
  const tall = solid.filter((b) => !b.low);
  const warnings: Warning[] = [];

  // 1. 겹침
  for (let i = 0; i < solid.length; i++) {
    for (let j = i + 1; j < solid.length; j++) {
      const a = solid[i];
      const b = solid[j];
      if (partsOverlap(a.parts, b.parts)) {
        warnings.push({
          id: `overlap:${a.item.id}:${b.item.id}`,
          kind: "overlap",
          severity: "error",
          itemIds: [a.item.id, b.item.id],
          message: `${a.item.name} · ${b.item.name} 겹침`,
        });
      }
    }
  }

  // 2. 벽 밖·벽에 걸침 (이런 가구는 여유공간·통로 검사에서 뺀다: 같은 원인의 경고가 겹치므로)
  const outside = new Set<string>();
  for (const b of solid) {
    if (!rooms.some((r) => partsInsidePolygon(b.parts, r.points))) {
      outside.add(b.item.id);
      warnings.push({
        id: `outside:${b.item.id}`,
        kind: "outside",
        severity: "error",
        itemIds: [b.item.id],
        message: `${b.item.name}: 벽에 걸치거나 방 밖에 있어요`,
      });
    }
  }

  // 3. 문이 열리는 자리와 문 앞 (문 앞은 양쪽 40cm를 비워 둔다)
  const DOOR_APPROACH = 400;
  for (const o of openings) {
    const room = rooms.find((r) => r.id === o.roomId);
    if (!room || o.kind === "window") continue;
    const g = openingGeometry(room.points, o);
    // 벽 안쪽 면에서 바깥 법선 방향으로 from~to 사이의 문 폭만큼 영역
    const band = (from: number, to: number) => [
      add(g.start, scale(g.normal, from)),
      add(g.end, scale(g.normal, from)),
      add(g.end, scale(g.normal, to)),
      add(g.start, scale(g.normal, to)),
    ];
    const zones: { polygon: Vec2[]; what: string }[] = [];
    const label = `${room.name} ${OPENING_LABELS[o.kind]}`;
    if (o.kind === "hinged-door") {
      const sw = doorSwing(room.points, o, t);
      zones.push({ polygon: [sw.hinge, ...sw.arc], what: `${label}이 열리는 자리` });
      // 문이 열리지 않는 쪽 문 앞
      zones.push({
        polygon: o.swing.side === "in" ? band(t, t + DOOR_APPROACH) : band(-DOOR_APPROACH, 0),
        what: `${label} 앞`,
      });
    } else {
      zones.push({ polygon: band(-DOOR_APPROACH, t + DOOR_APPROACH), what: `${label} 앞` });
    }
    for (const b of solid) {
      const zone = zones.find((z) => partsOverlap(b.parts, [z.polygon], 10));
      if (!zone) continue;
      warnings.push({
        id: `door:${o.id}:${b.item.id}`,
        kind: "door",
        severity: "error",
        itemIds: [b.item.id],
        message: `${b.item.name}: ${zone.what}을 막아요`,
        zone: zone.polygon,
      });
    }
  }

  const placed = solid.filter((b) => !outside.has(b.item.id));
  const placedTall = placed.filter((b) => !b.low);

  // 여유공간 경고가 이미 난 가구–가구, 가구–벽은 통로 경고를 또 내지 않는다
  const reported = new Set<string>();

  // 4. 가구를 쓰는 데 필요한 여유공간
  for (const b of placed) {
    const catalog = findCatalogItem(b.item.catalogId);
    const spec = itemClearance(b.item);
    const zones = clearanceZones(b.item, spec);
    // 책상·식탁 앞은 의자가, 침대 옆은 협탁이 쓰는 자리라서 막는 것으로 보지 않는다
    const companion =
      catalog?.category === "table" ? isSeat : catalog?.category === "bed" ? isNightstand : null;
    const blockedBy = (polygon: Vec2[]) => {
      const other = tall.find(
        (o) =>
          o.item.id !== b.item.id && !companion?.(o.item) && partsOverlap(o.parts, [polygon], 10),
      );
      if (other) {
        reported.add(`${b.item.id}:${other.item.id}`);
        return other.item.name;
      }
      if (b.room && !partsInsidePolygon([polygon], b.room.points)) {
        reported.add(`${b.item.id}:wall`);
        return "벽";
      }
      return null;
    };
    const sides = zones.filter((z) => z.side === "left" || z.side === "right");
    const others = zones.filter((z) => z.side === "front" || z.side === "back");
    for (const z of others) {
      const by = blockedBy(z.polygon);
      if (by) {
        warnings.push({
          id: `clearance:${b.item.id}:${z.side}`,
          kind: "clearance",
          severity: "warning",
          itemIds: [b.item.id],
          message: `${b.item.name} ${z.side === "front" ? "앞" : "뒤"} ${cm(z.size)}이 ${by}에 막혀요`,
          zone: z.polygon,
        });
      }
    }
    if (sides.length === 2) {
      const blocked = sides.map((z) => blockedBy(z.polygon));
      const either = spec?.sideMode === "either";
      if (either ? blocked.every(Boolean) : blocked.some(Boolean)) {
        sides.forEach((z, i) => {
          if (!blocked[i]) return;
          warnings.push({
            id: `clearance:${b.item.id}:${z.side}`,
            kind: "clearance",
            severity: "warning",
            itemIds: [b.item.id],
            message: either
              ? `${b.item.name} 양옆이 모두 ${cm(z.size)}보다 좁아요`
              : `${b.item.name} ${z.side === "left" ? "왼쪽" : "오른쪽"} ${cm(z.size)}이 ${blocked[i]}에 막혀요`,
            zone: z.polygon,
          });
        });
      }
    }
  }

  // 5. 좁은 통로 (가구–가구, 가구–벽)
  for (let i = 0; i < placedTall.length; i++) {
    for (let j = i + 1; j < placedTall.length; j++) {
      const a = placedTall[i];
      const b = placedTall[j];
      if (a.room?.id !== b.room?.id || partsOverlap(a.parts, b.parts, 0)) continue;
      if (reported.has(`${a.item.id}:${b.item.id}`) || reported.has(`${b.item.id}:${a.item.id}`)) {
        continue;
      }
      const c = polygonDistance(a.outline, b.outline);
      if (c.distance > MIN_GAP && c.distance < minPassage) {
        warnings.push({
          id: `passage:${a.item.id}:${b.item.id}`,
          kind: "passage",
          severity: "warning",
          itemIds: [a.item.id, b.item.id],
          message: `${a.item.name} – ${b.item.name} 사이 ${cm(c.distance)} (권장 ${cm(minPassage)} 이상)`,
          gap: c,
        });
      }
    }
  }
  for (const b of placedTall) {
    if (!b.room || reported.has(`${b.item.id}:wall`)) continue;
    let best: ReturnType<typeof segmentPolygonDistance> | null = null;
    for (let i = 0; i < b.room.points.length; i++) {
      const [w0, w1] = edgeAt(b.room.points, i);
      const c = segmentPolygonDistance(w0, w1, b.outline);
      if (
        c.distance > MIN_GAP &&
        c.distance < minPassage &&
        (!best || c.distance < best.distance)
      ) {
        best = c;
      }
    }
    if (best) {
      warnings.push({
        id: `passage:${b.item.id}:wall`,
        kind: "passage",
        severity: "warning",
        itemIds: [b.item.id],
        message: `${b.item.name} – 벽 사이 ${cm(best.distance)} (권장 ${cm(minPassage)} 이상)`,
        gap: best,
      });
    }
  }

  return warnings;
}

export function countBySeverity(warnings: Warning[]) {
  return {
    error: warnings.filter((w) => w.severity === "error").length,
    warning: warnings.filter((w) => w.severity === "warning").length,
  };
}
