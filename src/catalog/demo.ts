import { findCatalogItem } from "@/catalog/furniture";
import { ROOM_PRESETS } from "@/catalog/roomPresets";
import {
  createEmptyDocument,
  createRoom,
  type FurnitureItem,
  type HouseDocument,
} from "@/domain/document";

/** 첫 화면에 보여 줄 예시 집 (투룸 + 가구) */
export function demoHouse(): HouseDocument {
  const doc = createEmptyDocument("예시 집");
  const preset = ROOM_PRESETS.find((p) => p.id === "two-room")!;
  doc.floorplan.rooms = preset.rooms.map((r, i) => ({
    ...createRoom(r.name, r.points, i),
    id: `room-${i}`,
  }));
  doc.floorplan.openings = [
    {
      id: "door-1",
      roomId: "room-1",
      edgeIndex: 3,
      offset: 2400,
      width: 900,
      height: 2100,
      sillHeight: 0,
      kind: "hinged-door",
      swing: { side: "in", hinge: "end" },
    },
    {
      id: "door-2",
      roomId: "room-2",
      edgeIndex: 0,
      offset: 100,
      width: 800,
      height: 2100,
      sillHeight: 0,
      kind: "hinged-door",
      swing: { side: "in", hinge: "end" },
    },
  ];
  const put = (catalogId: string, x: number, y: number, rotation = 0): FurnitureItem => {
    const c = findCatalogItem(catalogId)!;
    return {
      id: `${catalogId}-${x}-${y}`,
      catalogId,
      name: c.name,
      x,
      y,
      rotation,
      width: c.width,
      depth: c.depth,
      height: c.height,
      color: c.color,
    };
  };
  doc.layouts[0].items = [
    put("sofa-3", 2400, 3150, 180),
    put("coffee-table", 2400, 2300),
    put("tv-stand", 2400, 200),
    put("dining-4", 900, 900, 90),
    put("bed-queen", 7500, 1000),
    put("wardrobe", 6400, 3300, 180),
    put("desk", 2400, 4000),
    put("bed-single", 550, 5500),
    put("plant", 4500, 3300),
  ];
  return doc;
}
