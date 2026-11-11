import { describe, expect, it } from "vitest";
import { findCatalogItem } from "@/catalog/furniture";
import type { FurnitureItem, HouseDocument, Opening } from "@/domain/document";
import { checkLayout } from "@/domain/warnings";
import { convexOverlap, partsInsidePolygon } from "@/geometry/collision";
import { rectPoints } from "@/geometry/roomEdit";

const room = { id: "r", name: "방", floorColor: "#fff", points: rectPoints(0, 0, 4000, 3000) };

function doc(openings: Opening[] = []): Pick<HouseDocument, "floorplan" | "settings"> {
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

const kinds = (items: FurnitureItem[], openings: Opening[] = []) =>
  checkLayout(doc(openings), items).map((w) => w.kind);

describe("collision helpers", () => {
  it("treats touching shapes as not overlapping", () => {
    const a = rectPoints(0, 0, 1000, 1000);
    expect(convexOverlap(a, rectPoints(1000, 0, 500, 500))).toBe(false);
    expect(convexOverlap(a, rectPoints(990, 0, 500, 500))).toBe(true);
  });

  it("counts flush-to-wall shapes as inside, crossing ones as outside", () => {
    expect(partsInsidePolygon([rectPoints(0, 0, 1000, 600)], room.points)).toBe(true);
    expect(partsInsidePolygon([rectPoints(-50, 0, 1000, 600)], room.points)).toBe(false);
  });
});

describe("checkLayout", () => {
  it("finds overlapping furniture but ignores rugs", () => {
    expect(kinds([put("desk", 1000, 1000), put("drawer", 1300, 1000)])).toContain("overlap");
    expect(kinds([put("desk", 1000, 1000), put("rug", 1000, 1000)])).not.toContain("overlap");
  });

  it("flags furniture crossing a wall", () => {
    expect(kinds([put("desk", 300, 1500)])).toEqual(["outside"]);
  });

  it("flags furniture in a door's swing", () => {
    const door: Opening = {
      id: "d",
      roomId: "r",
      edgeIndex: 0,
      offset: 1000,
      width: 900,
      height: 2100,
      sillHeight: 0,
      kind: "hinged-door",
      swing: { side: "in", hinge: "start" },
    };
    // 문 바로 안쪽에 둔 서랍장
    expect(kinds([put("drawer", 1450, 400)], [door])).toContain("door");
    // 멀리 둔 서랍장은 괜찮음
    expect(kinds([put("drawer", 3000, 2000)], [door])).not.toContain("door");
  });

  it("checks the space a piece of furniture needs", () => {
    // 옷장 앞(아래쪽) 60cm 안에 벽: 옷장 중심 y=2400, 깊이 60 → 앞면 2700, 벽 3000 → 30cm
    const w = checkLayout(doc(), [put("wardrobe", 2000, 2400)]);
    expect(w.map((x) => x.message)).toContain("옷장 앞 60cm이 벽에 막혀요");
    // 장롱도 문을 열 앞 공간이 있어야 한다
    const j = checkLayout(doc(), [put("jangnong", 2000, 2400)]);
    expect(j.map((x) => x.message)).toContain("장롱 앞 60cm이 벽에 막혀요");
    // 가구마다 문 여는 공간을 바꿀 수 있다: 0이면 미닫이처럼 앞이 막혀도 괜찮다
    const sliding = { ...put("jangnong", 2000, 2400), doorSpace: 0 };
    expect(kinds([sliding])).not.toContain("clearance");
    const wide = { ...put("wardrobe", 2000, 2000), doorSpace: 900 };
    expect(checkLayout(doc(), [wide]).map((x) => x.message)).toContain(
      "옷장 앞 90cm이 벽에 막혀요",
    );

    // 소파 앞의 낮은 거실 테이블은 막는 것으로 보지 않는다
    expect(kinds([put("sofa-3", 2000, 2550, 180), put("coffee-table", 2000, 1700)])).toEqual([]);
  });

  it("only complains about a bed when both sides are blocked", () => {
    // 한쪽 벽에 붙인 퀸 침대: 다른 쪽이 비어 있으면 괜찮음
    expect(kinds([put("bed-queen", 750, 1000)])).not.toContain("clearance");
    // 양옆에 옷장
    const tight = [
      put("bed-queen", 2000, 1000),
      put("wardrobe", 900, 600, 90),
      put("wardrobe", 3100, 600, 90),
    ];
    expect(kinds(tight)).toContain("clearance");
  });

  it("flags narrow passages but not pieces pushed together", () => {
    const pair = (gap: number) => [
      put("wardrobe", 1500, 300),
      put("wardrobe", 1500 + 1200 + gap, 300),
    ];
    const passages = (gap: number) =>
      checkLayout(doc(), pair(gap)).filter((w) => w.kind === "passage" && w.itemIds.length === 2);
    expect(passages(400)).toHaveLength(1);
    expect(passages(400)[0].message).toContain("40cm");
    expect(passages(50)).toHaveLength(0);
    expect(passages(800)).toHaveLength(0);
  });
});

describe("door approach and duplicate warnings", () => {
  const door: Opening = {
    id: "d",
    roomId: "r",
    edgeIndex: 0,
    offset: 1000,
    width: 900,
    height: 2100,
    sillHeight: 0,
    kind: "hinged-door",
    swing: { side: "out", hinge: "start" },
  };

  it("flags furniture right in front of a door on the side it doesn't swing to", () => {
    // 바깥으로 열리는 문 → 방 안쪽 문 앞 40cm를 막는 서랍장
    const w = checkLayout(doc([door]), [put("drawer", 1450, 300)]);
    expect(w.map((x) => x.message)).toContain("서랍장: 방 여닫이문 앞을 막아요");
  });

  it("does not repeat a wall-blocked clearance as a narrow passage", () => {
    // 식탁 뒤(위쪽) 60cm가 벽에 막힘 → 같은 벽과의 통로 경고는 내지 않음
    const w = checkLayout(doc(), [put("dining-4", 2000, 800)]);
    expect(w.filter((x) => x.kind === "clearance")).toHaveLength(1);
    expect(w.filter((x) => x.kind === "passage")).toHaveLength(0);
  });

  it("lets a chair sit in a desk's clearance but not a wardrobe's", () => {
    // 책상(가로 120·깊이 60) 앞에 의자를 붙여 놓음
    expect(kinds([put("desk", 2000, 300), put("chair", 2000, 850, 180)])).toEqual([]);
    expect(kinds([put("wardrobe", 2000, 300), put("chair", 2000, 1100, 180)])).toContain(
      "clearance",
    );
  });

  it("lets nightstands flank a bed without blocking its sides", () => {
    // 퀸 침대(가로 150) 머리맡 양옆에 협탁
    const bed = put("bed-queen", 2000, 1050);
    const sides = [-1, 1].map((k) => put("nightstand", 2000 + k * 975, 200));
    expect(kinds([bed, ...sides])).toEqual([]);
  });
});

describe("demo house", () => {
  it("is a clean example with no problems", async () => {
    const { demoHouse } = await import("@/catalog/demo");
    const demo = demoHouse();
    const errors = checkLayout(demo, demo.layouts[0].items).filter((w) => w.severity === "error");
    expect(errors.map((w) => w.message)).toEqual([]);
  });
});
