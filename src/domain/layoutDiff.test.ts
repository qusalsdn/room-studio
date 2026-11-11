import { describe, expect, it } from "vitest";
import type { FurnitureItem } from "@/domain/document";
import { diffLayouts, nextLayoutName } from "@/domain/layoutDiff";

const item = (id: string, x: number, y: number, rotation = 0): FurnitureItem => ({
  id,
  catalogId: "desk",
  name: id,
  x,
  y,
  rotation,
  width: 1200,
  depth: 600,
  height: 730,
  color: "#ccc",
});

describe("diffLayouts", () => {
  it("classifies moved, rotated, added, removed and unchanged items", () => {
    const a = {
      items: [item("bed", 0, 0), item("desk", 1000, 0), item("sofa", 0, 2000), item("tv", 0, 0)],
    };
    const b = {
      items: [
        item("bed", 0, 1500), // 1.5m 이동
        item("desk", 1010, 0), // 1cm: 그대로
        item("sofa", 0, 2000, 360), // 360° = 그대로
        item("chair", 500, 500), // 새로 추가
      ],
    };
    const d = diffLayouts(a, b);
    expect(d.moved.map((m) => [m.id, Math.round(m.distance)])).toEqual([["bed", 1500]]);
    expect(d.unchanged.map((i) => i.id)).toEqual(["desk", "sofa"]);
    expect(d.added.map((i) => i.id)).toEqual(["chair"]);
    expect(d.removed.map((i) => i.id)).toEqual(["tv"]);
  });

  it("flags rotation-only changes", () => {
    const d = diffLayouts({ items: [item("bed", 0, 0, 0)] }, { items: [item("bed", 0, 0, 90)] });
    expect(d.moved[0]).toMatchObject({ id: "bed", rotated: true, distance: 0 });
  });

  it("flags a piece replaced in place, even with the same size", () => {
    const desk = item("d", 0, 0);
    const swapped = { ...desk, catalogId: "computer-desk", name: "컴퓨터 책상" };
    const d = diffLayouts({ items: [desk] }, { items: [swapped] });
    expect(d.moved[0]).toMatchObject({ replaced: true, renamed: false, distance: 0 });

    const renamed = diffLayouts({ items: [desk] }, { items: [{ ...desk, name: "공부 책상" }] });
    expect(renamed.moved[0]).toMatchObject({ replaced: false, renamed: true });
  });
});

describe("nextLayoutName", () => {
  it("picks the first unused letter", () => {
    expect(nextLayoutName(["현재 배치"])).toBe("배치안 A");
    expect(nextLayoutName(["현재 배치", "배치안 A", "배치안 C"])).toBe("배치안 B");
  });
});
