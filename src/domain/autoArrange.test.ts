import { describe, expect, it } from "vitest";
import { demoHouse } from "@/catalog/demo";
import { findCatalogItem } from "@/catalog/furniture";
import { autoArrange, placementOf } from "@/domain/autoArrange";
import type { FurnitureItem, HouseDocument, Opening } from "@/domain/document";
import { checkLayout, countBySeverity } from "@/domain/warnings";
import { itemBounds } from "@/geometry/furniture";
import { pointInPolygon } from "@/geometry/polygon";
import { rectPoints } from "@/geometry/roomEdit";

const room = { id: "r", name: "방", floorColor: "#fff", points: rectPoints(0, 0, 4000, 3000) };
const door: Opening = {
  id: "d",
  roomId: "r",
  edgeIndex: 0,
  offset: 200,
  width: 900,
  height: 2100,
  sillHeight: 0,
  kind: "hinged-door",
  swing: { side: "in", hinge: "start" },
};

function doc(openings: Opening[] = [door]): Pick<HouseDocument, "floorplan" | "settings"> {
  return {
    settings: { wallThickness: 100, wallHeight: 2400, displayUnit: "cm" },
    floorplan: { rooms: [room], openings },
  };
}

let seq = 0;
function put(catalogId: string, x: number, y: number, rotation = 0): FurnitureItem {
  const c = findCatalogItem(catalogId)!;
  return {
    id: `${catalogId}-${seq++}`,
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
}

const errors = (d: ReturnType<typeof doc>, items: FurnitureItem[]) =>
  countBySeverity(checkLayout(d, items)).error;

/** 등(로컬 -y 쪽 변)이 방의 어느 벽에 닿아 있는지 */
function backOnWall(item: FurnitureItem): boolean {
  const b = itemBounds(item);
  const r = ((item.rotation % 360) + 360) % 360;
  if (r === 0) return b.minY === 0;
  if (r === 90) return b.maxX === 4000;
  if (r === 180) return b.maxY === 3000;
  if (r === 270) return b.minX === 0;
  return false;
}

describe("autoArrange", () => {
  it("untangles a pile of furniture into an error-free layout", () => {
    const items = [
      put("bed-queen", 2000, 1500),
      put("wardrobe", 2000, 1500),
      put("desk", 2000, 1500),
      put("chair", 2000, 1500),
      put("drawer", 2000, 1500),
    ];
    expect(errors(doc(), items)).toBeGreaterThan(0);
    const { items: out, unplaced } = autoArrange(doc(), items);
    expect(unplaced).toEqual([]);
    expect(errors(doc(), out)).toBe(0);
    for (const item of out) {
      if (placementOf(item) === "wall") expect(backOnWall(item), item.name).toBe(true);
    }
  });

  it("keeps an already good layout as it is", () => {
    const items = [put("bed-single", 3000, 1500, 90), put("desk", 2000, 2700, 180)];
    expect(checkLayout(doc(), items)).toEqual([]);
    expect(autoArrange(doc(), items).items).toEqual(items);
  });

  it("pulls wall furniture straight back to the nearest wall", () => {
    const [desk] = autoArrange(doc([]), [put("desk", 1500, 2500, 180)]).items;
    expect(desk).toMatchObject({ x: 1500, y: 2700, rotation: 180 });
  });

  it("does not move fixed items or rugs, and others avoid them", () => {
    const fixedDesk = put("desk", 2000, 1500);
    const rug = put("rug", 1000, 1000);
    const drawer = put("drawer", 2000, 1500);
    const { items: out } = autoArrange(doc(), [fixedDesk, rug, drawer], {
      fixedIds: [fixedDesk.id],
    });
    expect(out[0]).toEqual(fixedDesk);
    expect(out[1]).toEqual(rug);
    expect(errors(doc(), out)).toBe(0);
  });

  it("reports furniture that cannot fit", () => {
    const items = [put("bed-king", 2000, 1500), put("bed-king", 2000, 1500)];
    const tiny = { ...room, points: rectPoints(0, 0, 2200, 2200) };
    const d = { ...doc([]), floorplan: { rooms: [tiny], openings: [] } };
    const { unplaced } = autoArrange(d, items);
    expect(unplaced).toHaveLength(1);
  });

  it("only touches rooms in scope", () => {
    const house = demoHouse();
    const items = house.layouts[0].items.map((i) => ({ ...i, x: i.x + 50 }));
    const { items: out } = autoArrange(house, items, { roomIds: ["room-1"] });
    const rooms = house.floorplan.rooms;
    out.forEach((item, i) => {
      if (!pointInPolygon(items[i], rooms[1].points)) expect(item).toEqual(items[i]);
    });
  });

  it("is deterministic and fast on the demo house", () => {
    const house = demoHouse();
    const scrambled = house.layouts[0].items.map((i, k) => ({
      ...i,
      x: i.x + ((k * 377) % 900) - 450,
      y: i.y + ((k * 211) % 900) - 450,
    }));
    const t0 = performance.now();
    const a = autoArrange(house, scrambled);
    const ms = performance.now() - t0;
    expect(autoArrange(house, scrambled)).toEqual(a);
    expect(countBySeverity(checkLayout(house, a.items)).error).toBe(0);
    expect(ms).toBeLessThan(2000);
  });
});
