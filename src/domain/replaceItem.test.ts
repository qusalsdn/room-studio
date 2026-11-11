import { describe, expect, it } from "vitest";
import { findCatalogItem } from "@/catalog/furniture";
import type { FurnitureItem, HouseDocument } from "@/domain/document";
import { replaceItem, type ReplaceSpec } from "@/domain/replaceItem";
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

const spec = (catalogId: string, size: Partial<ReplaceSpec> = {}): ReplaceSpec => {
  const c = findCatalogItem(catalogId)!;
  return {
    catalogId,
    name: c.name,
    width: c.width,
    depth: c.depth,
    height: c.height,
    color: c.color,
    ...size,
  };
};

describe("replaceItem", () => {
  it("keeps the back against the wall when the new piece is deeper", () => {
    // 옷장(가로 120·깊이 60)이 위쪽 벽에 붙어 있음
    const wardrobe = put("wardrobe", 2000, 300);
    const r = replaceItem(doc, [wardrobe], wardrobe.id, spec("jangnong", { depth: 700 }))!;
    expect(r.item).toMatchObject({ id: wardrobe.id, catalogId: "jangnong", x: 2000, y: 350 });
    expect(r.fits).toBe(true);
  });

  it("works for rotated furniture too", () => {
    // 오른쪽 벽에 등을 댄 옷장 (회전 90°)
    const wardrobe = put("wardrobe", 3700, 1500, 90);
    const r = replaceItem(doc, [wardrobe], wardrobe.id, spec("wardrobe", { depth: 700 }))!;
    expect(r.item).toMatchObject({ x: 3650, y: 1500, rotation: 90 });
  });

  it("keeps a corner desk in the corner when it gets wider", () => {
    // 책상(가로 120) 왼쪽 위 모서리
    const left = put("desk", 600, 300);
    expect(replaceItem(doc, [left], left.id, spec("desk", { width: 1400 }))!.item).toMatchObject({
      x: 700,
      y: 300,
    });
    // 오른쪽 위 모서리
    const right = put("desk", 3400, 300);
    expect(replaceItem(doc, [right], right.id, spec("desk", { width: 1400 }))!.item).toMatchObject({
      x: 3300,
      y: 300,
    });
  });

  it("keeps the side touching another piece", () => {
    const wardrobe = put("wardrobe", 600, 300); // x 0~1200
    const drawer = put("drawer", 1600, 225); // x 1200~2000, 옷장 오른쪽에 붙음
    const r = replaceItem(doc, [wardrobe, drawer], drawer.id, spec("drawer", { width: 1000 }))!;
    expect(r.item.x).toBe(1700);
    expect(r.fits).toBe(true);
  });

  it("keeps the center of free-standing furniture", () => {
    const table = put("dining-4", 2000, 1500);
    const r = replaceItem(doc, [table], table.id, spec("dining-6"))!;
    expect(r.item).toMatchObject({ x: 2000, y: 1500 });
  });

  it("reports new problems when the new piece does not fit", () => {
    const wardrobe = put("wardrobe", 600, 300);
    const drawer = put("drawer", 2400, 225);
    // 오른쪽에 아무것도 없으니 가운데 기준으로 넓어져 옷장과 겹친다
    const r = replaceItem(doc, [wardrobe, drawer], drawer.id, spec("drawer", { width: 2600 }))!;
    expect(r.fits).toBe(false);
    expect(r.problems.join()).toContain("겹침");
  });

  it("points out a chair left behind by a narrower desk swap", () => {
    // 책상 앞 의자 → 책상을 왼쪽 모서리로 붙은 더 좁은 것으로 바꾸면 의자 자리가 어긋난다
    const desk = put("desk", 600, 300);
    const chair = put("chair", 600, 850);
    expect(replaceItem(doc, [desk, chair], desk.id, spec("desk"))!.related).toEqual([]);
    const r = replaceItem(doc, [desk, chair], desk.id, spec("desk", { width: 2000 }))!;
    expect(r.related).toEqual([chair.id]);
  });

  it("does not count problems that were already there", () => {
    const wardrobe = put("wardrobe", 600, 300);
    const drawer = put("drawer", 1000, 225); // 이미 옷장과 겹침
    const r = replaceItem(doc, [wardrobe, drawer], drawer.id, spec("bookshelf"))!;
    expect(r.problems).toEqual([]);
  });
});
