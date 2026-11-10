import { describe, expect, it } from "vitest";
import {
  centroid,
  isSimplePolygon,
  offsetPolygon,
  outwardNormal,
  pointInPolygon,
  polygonArea,
} from "@/geometry/polygon";
import {
  moveEdge,
  moveVertex,
  rectPoints,
  removeCollinearPoints,
  setEdgeLength,
  splitEdge,
} from "@/geometry/roomEdit";

const rect = rectPoints(0, 0, 4000, 3000);

describe("polygon basics", () => {
  it("computes area and centroid", () => {
    expect(polygonArea(rect)).toBe(12_000_000);
    expect(centroid(rect)).toEqual({ x: 2000, y: 1500 });
  });

  it("finds outward normals for both windings", () => {
    expect(outwardNormal(rect, 0)).toEqual({ x: 0, y: -1 });
    const reversed = [...rect].reverse();
    // reversed[0]→reversed[1] = (0,3000)→(4000,3000): 아랫변, 바깥은 +y
    expect(outwardNormal(reversed, 0)).toEqual({ x: 0, y: 1 });
  });

  it("offsets a rectangle outward", () => {
    expect(offsetPolygon(rect, 100)).toEqual([
      { x: -100, y: -100 },
      { x: 4100, y: -100 },
      { x: 4100, y: 3100 },
      { x: -100, y: 3100 },
    ]);
  });

  it("detects self-intersection", () => {
    expect(isSimplePolygon(rect)).toBe(true);
    const bowtie = [
      { x: 0, y: 0 },
      { x: 100, y: 100 },
      { x: 100, y: 0 },
      { x: 0, y: 100 },
    ];
    expect(isSimplePolygon(bowtie)).toBe(false);
  });

  it("tests point containment", () => {
    expect(pointInPolygon({ x: 10, y: 10 }, rect)).toBe(true);
    expect(pointInPolygon({ x: -10, y: 10 }, rect)).toBe(false);
  });
});

describe("room edits", () => {
  it("moves a vertex while keeping right angles", () => {
    const out = moveVertex(rect, 2, { x: 4500, y: 3200 });
    expect(out).toEqual([
      { x: 0, y: 0 },
      { x: 4500, y: 0 },
      { x: 4500, y: 3200 },
      { x: 0, y: 3200 },
    ]);
  });

  it("moves an edge outward and inward", () => {
    // 윗변을 바깥으로 500 → 높이 3500
    expect(moveEdge(rect, 0, 500)).toEqual(rectPoints(0, -500, 4000, 3500));
    // 오른쪽 변을 안으로 1000 → 폭 3000
    expect(moveEdge(rect, 1, -1000)).toEqual(rectPoints(0, 0, 3000, 3000));
  });

  it("creates a step when moving half of a split edge (ㄱ자 만들기)", () => {
    const split = splitEdge(rect, 0, { x: 2000, y: 0 });
    // 새 변 1: (2000,0)→(4000,0). 안쪽으로 1000 밀기
    const out = moveEdge(split, 1, -1000);
    expect(out).toEqual([
      { x: 0, y: 0 },
      { x: 2000, y: 0 },
      { x: 2000, y: 1000 },
      { x: 4000, y: 1000 },
      { x: 4000, y: 3000 },
      { x: 0, y: 3000 },
    ]);
    expect(isSimplePolygon(out)).toBe(true);
  });

  it("sets edge length by stretching across the edge end", () => {
    const out = setEdgeLength(rect, 0, 4500);
    expect(out).toEqual(rectPoints(0, 0, 4500, 3000));
    // 아랫변(역방향)도 같은 결과
    expect(setEdgeLength(rect, 2, 4500)).toEqual([
      { x: -500, y: 0 },
      { x: 4000, y: 0 },
      { x: 4000, y: 3000 },
      { x: -500, y: 3000 },
    ]);
  });

  it("removes collinear points", () => {
    const split = splitEdge(rect, 0, { x: 2000, y: 0 });
    expect(removeCollinearPoints(split)).toEqual(rect);
  });
});
