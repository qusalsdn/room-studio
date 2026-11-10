import { nanoid } from "nanoid";
import { z } from "zod";

/**
 * 집 하나를 표현하는 편집 문서.
 * - 모든 좌표·길이는 mm 정수, y축은 화면과 같이 아래로 증가.
 * - 방 폴리곤은 "벽 안쪽 면"을 따라간다. 벽은 바깥으로 두께만큼 그린다.
 * - 구조(floorplan)는 모든 배치안이 공유하고, 가구(items)만 배치안별로 다르다.
 */
export const SCHEMA_VERSION = 1;

const vec2Schema = z.object({ x: z.number(), y: z.number() });

const roomSchema = z.object({
  id: z.string(),
  name: z.string(),
  points: z.array(vec2Schema).min(3),
  floorColor: z.string(),
});

const openingSchema = z.object({
  id: z.string(),
  roomId: z.string(),
  edgeIndex: z.number().int().nonnegative(),
  /** 벽 시작점에서 개구부 시작까지의 거리 */
  offset: z.number(),
  width: z.number(),
  height: z.number(),
  sillHeight: z.number(),
  kind: z.enum(["hinged-door", "sliding-door", "window"]),
  /** 여닫이문: 열리는 쪽(방 안/밖)과 경첩 위치 */
  swing: z.object({ side: z.enum(["in", "out"]), hinge: z.enum(["start", "end"]) }),
});

const furnitureItemSchema = z.object({
  id: z.string(),
  catalogId: z.string(),
  name: z.string(),
  x: z.number(),
  y: z.number(),
  rotation: z.number(),
  width: z.number(),
  depth: z.number(),
  height: z.number(),
  color: z.string(),
});

const layoutSchema = z.object({
  id: z.string(),
  name: z.string(),
  isCurrent: z.boolean(),
  items: z.array(furnitureItemSchema),
});

export const houseDocumentSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  name: z.string(),
  settings: z.object({
    wallThickness: z.number(),
    wallHeight: z.number(),
    displayUnit: z.enum(["cm", "mm", "m"]),
  }),
  floorplan: z.object({
    rooms: z.array(roomSchema),
    openings: z.array(openingSchema),
  }),
  layouts: z.array(layoutSchema).min(1),
  /** 편집기에서 마지막으로 보던 배치안 (없으면 "현재 배치") */
  editingLayoutId: z.string().optional(),
});

export type Vec2 = z.infer<typeof vec2Schema>;
export type Room = z.infer<typeof roomSchema>;
export type Opening = z.infer<typeof openingSchema>;
export type FurnitureItem = z.infer<typeof furnitureItemSchema>;
export type Layout = z.infer<typeof layoutSchema>;
export type HouseDocument = z.infer<typeof houseDocumentSchema>;

export const ROOM_COLORS = ["#f3ede2", "#e6eef2", "#eef2e6", "#f2e8ee", "#efece6"];

export function newId(): string {
  return nanoid(10);
}

export function createRoom(name: string, points: Vec2[], colorIndex = 0): Room {
  return {
    id: newId(),
    name,
    points: points.map((p) => ({ x: Math.round(p.x), y: Math.round(p.y) })),
    floorColor: ROOM_COLORS[colorIndex % ROOM_COLORS.length],
  };
}

export function createEmptyDocument(name = "우리 집"): HouseDocument {
  return {
    schemaVersion: SCHEMA_VERSION,
    name,
    settings: { wallThickness: 100, wallHeight: 2400, displayUnit: "cm" },
    floorplan: { rooms: [], openings: [] },
    layouts: [{ id: newId(), name: "현재 배치", isCurrent: true, items: [] }],
  };
}

/** 저장된 데이터를 검증해 현재 스키마 문서로 돌려준다. 실패하면 null. */
export function parseDocument(raw: unknown): HouseDocument | null {
  const result = houseDocumentSchema.safeParse(raw);
  return result.success ? result.data : null;
}
