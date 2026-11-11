import { describe, expect, it } from "vitest";
import { findCatalogItem } from "@/catalog/furniture";
import type { FurnitureItem, HouseDocument } from "@/domain/document";
import { suggestSpots } from "@/domain/suggestSpots";
import { checkLayout, countBySeverity } from "@/domain/warnings";
import { rectPoints } from "@/geometry/roomEdit";

const room = { id: "r", name: "방", floorColor: "#fff", points: rectPoints(0, 0, 4000, 3000) };
const doc: Pick<HouseDocument, "floorplan" | "settings"> = {
  settings: { wallThickness: 100, wallHeight: 2400, displayUnit: "cm" },
  floorplan: { rooms: [room], openings: [] },
};

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

const errors = (items: FurnitureItem[]) => countBySeverity(checkLayout(doc, items)).error;

describe("suggestSpots", () => {
  it("offers a few distinct spots for a new chair, the desk seat first", () => {
    const desk = put("desk", 2000, 2700, 180);
    const chair = put("chair", 600, 600);
    const { spots, currentIsBest } = suggestSpots(doc, [desk, chair], chair.id, { isNew: true });
    expect(currentIsBest).toBe(false);
    expect(spots).toHaveLength(3);
    // 책상 앞, 책상을 바라보게
    expect(spots[0]).toMatchObject({
      x: 2000,
      y: 2700 - 300 - 250,
      rotation: 0,
      reasons: ["책상 앞"],
    });
    for (let i = 0; i < spots.length; i++) {
      for (let j = i + 1; j < spots.length; j++) {
        const far = Math.hypot(spots[i].x - spots[j].x, spots[i].y - spots[j].y) >= 500;
        expect(far || spots[i].rotation !== spots[j].rotation).toBe(true);
      }
    }
  });

  it("says the current spot is best when nothing beats it", () => {
    const desk = put("desk", 2000, 2700, 180);
    const chair = put("chair", 2000, 2150, 0);
    const { spots, currentIsBest } = suggestSpots(doc, [desk, chair], chair.id);
    expect(spots).toEqual([]);
    expect(currentIsBest).toBe(true);
  });

  it("moves an overlapping item to error-free spots", () => {
    const wardrobe = put("wardrobe", 2000, 300);
    const drawer = put("drawer", 2000, 400);
    expect(errors([wardrobe, drawer])).toBeGreaterThan(0);
    const { spots } = suggestSpots(doc, [wardrobe, drawer], drawer.id);
    expect(spots.length).toBeGreaterThan(0);
    for (const s of spots) expect(errors([wardrobe, { ...drawer, ...s }])).toBe(0);
  });

  it("returns nothing when there is no room left", () => {
    const tiny = { ...room, points: rectPoints(0, 0, 1600, 2100) };
    const d = { ...doc, floorplan: { rooms: [tiny], openings: [] } };
    const bed = put("bed-queen", 800, 1050);
    const extra = put("bed-queen", 800, 1050);
    const result = suggestSpots(d, [bed, extra], extra.id, { isNew: true });
    expect(result).toEqual({ spots: [], currentIsBest: false });
  });

  it("explains spots with the rules they satisfy", () => {
    const window = {
      id: "w",
      roomId: "r",
      edgeIndex: 1,
      offset: 900,
      width: 1200,
      height: 1200,
      sillHeight: 900,
      kind: "window" as const,
      swing: { side: "in" as const, hinge: "start" as const },
    };
    const d = { ...doc, floorplan: { rooms: [room], openings: [window] } };
    const living = { ...room, points: rectPoints(0, 0, 4000, 4000) };
    const ld = { ...doc, floorplan: { rooms: [living], openings: [] } };

    const desk = put("desk", 1000, 2700, 180);
    expect(suggestSpots(d, [desk], desk.id).spots[0].reasons).toContain("창가");

    const tv = put("tv-stand", 2000, 200, 0);
    const sofa = put("sofa-3", 600, 2500, 90);
    expect(suggestSpots(ld, [tv, sofa], sofa.id, { isNew: true }).spots[0].reasons).toContain(
      "TV 맞은편",
    );

    const plant = put("plant", 2000, 1500);
    expect(suggestSpots(ld, [plant], plant.id, { isNew: true }).spots[0].reasons).toEqual([
      "겹치거나 막는 것 없음",
    ]);
  });
});
