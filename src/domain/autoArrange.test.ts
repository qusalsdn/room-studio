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

/** 가구 앞(로컬 +y) 방향 */
function frontOf(item: FurnitureItem) {
  const r = (item.rotation * Math.PI) / 180;
  return { x: -Math.sin(r), y: Math.cos(r) };
}
function facing(from: FurnitureItem, to: FurnitureItem): number {
  const f = frontOf(from);
  const d = Math.hypot(to.x - from.x, to.y - from.y);
  return (f.x * (to.x - from.x) + f.y * (to.y - from.y)) / d;
}
const byCatalog = (items: FurnitureItem[], id: string) => items.filter((i) => i.catalogId === id);

describe("autoArrange rules", () => {
  const living = { ...room, points: rectPoints(0, 0, 4000, 5000) };
  const livingDoc = { ...doc([]), floorplan: { rooms: [living], openings: [] } };

  it("puts the sofa facing the TV stand with the coffee table in between", () => {
    const items = [
      put("sofa-3", 1000, 1000, 90),
      put("tv-stand", 3000, 1200, 0),
      put("coffee-table", 3000, 4000),
    ];
    const out = autoArrange(livingDoc, items).items;
    const [sofa] = byCatalog(out, "sofa-3");
    const [tv] = byCatalog(out, "tv-stand");
    const [table] = byCatalog(out, "coffee-table");
    expect(facing(sofa, tv)).toBeGreaterThan(0.95);
    expect(facing(tv, sofa)).toBeGreaterThan(0.95);
    const gap = Math.hypot(tv.x - sofa.x, tv.y - sofa.y) - (sofa.depth + tv.depth) / 2;
    expect(gap).toBeGreaterThanOrEqual(1500);
    expect(gap).toBeLessThanOrEqual(3000);
    // 소파 앞 40cm
    const f = frontOf(sofa);
    const off = sofa.depth / 2 + 400 + table.depth / 2;
    expect(table.x).toBeCloseTo(sofa.x + f.x * off, -1);
    expect(table.y).toBeCloseTo(sofa.y + f.y * off, -1);
    expect(errors(livingDoc, out)).toBe(0);
  });

  it("tucks a chair in front of the desk, facing it", () => {
    const out = autoArrange(doc(), [put("desk", 2000, 2700, 180), put("chair", 600, 600)]).items;
    const [desk] = byCatalog(out, "desk");
    const [chair] = byCatalog(out, "chair");
    expect(facing(chair, desk)).toBeGreaterThan(0.99);
    expect(Math.hypot(chair.x - desk.x, chair.y - desk.y)).toBeCloseTo(
      (desk.depth + chair.depth) / 2,
      0,
    );
    expect(checkLayout(doc(), out)).toEqual([]);
  });

  it("seats four chairs around a dining table", () => {
    const chairs = [0, 1, 2, 3].map((k) => put("chair", 500 + k * 600, 2600));
    const out = autoArrange(livingDoc, [put("dining-4", 2000, 2500), ...chairs]).items;
    const [table] = byCatalog(out, "dining-4");
    for (const c of byCatalog(out, "chair")) expect(facing(c, table)).toBeGreaterThan(0.7);
    expect(errors(livingDoc, out)).toBe(0);
  });

  it("puts nightstands on both sides of the bed head", () => {
    const items = [
      put("bed-queen", 2000, 1800),
      put("nightstand", 500, 2500),
      put("nightstand", 3500, 2500),
    ];
    const out = autoArrange(livingDoc, items).items;
    const [bed] = byCatalog(out, "bed-queen");
    const stands = byCatalog(out, "nightstand");
    for (const s of stands) {
      expect(s.rotation).toBe(bed.rotation);
      // 침대 가로 방향으로 딱 붙어 있다
      const side = Math.hypot(s.x - bed.x, s.y - bed.y);
      expect(side).toBeGreaterThan((bed.width + s.width) / 2 - 1);
      expect(side).toBeLessThan((bed.width + s.width) / 2 + (bed.depth - s.depth) / 2 + 1);
    }
    expect(stands[0].x === stands[1].x && stands[0].y === stands[1].y).toBe(false);
    expect(errors(livingDoc, out)).toBe(0);
  });

  it("moves the desk to the window", () => {
    const win: Opening = {
      ...door,
      id: "w",
      edgeIndex: 1,
      offset: 900,
      width: 1200,
      kind: "window",
      sillHeight: 900,
    };
    const d = doc([win]);
    const [desk] = autoArrange(d, [put("desk", 1000, 2700, 180)]).items;
    // 오른쪽 벽(x=4000) 창문 앞으로
    expect(desk.rotation).toBe(90);
    expect(Math.abs(desk.y - 1500)).toBeLessThanOrEqual(100);
  });

  it("keeps the bed out of the line of the door", () => {
    const [bed] = autoArrange(doc(), [put("bed-single", 700, 1200)]).items;
    // 문은 위쪽 벽 x=200~1100, 방 안으로 1.5m
    const b = itemBounds(bed);
    const inLine = b.minX < 1100 && b.maxX > 200 && b.minY < 1500;
    expect(inLine).toBe(false);
  });
});
