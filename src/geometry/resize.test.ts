import { describe, expect, it } from "vitest";
import { itemCorners, resizeItem } from "@/geometry/furniture";

const item = { x: 1000, y: 1000, rotation: 0, width: 800, depth: 400 };

describe("resizeItem", () => {
  it("drags the right edge and keeps the left edge fixed", () => {
    const r = resizeItem(item, { sx: 1, sy: 0 }, { x: 1600, y: 1234 }).patch;
    expect(r).toEqual({ x: 1100, y: 1000, width: 1000, depth: 400 });
  });

  it("drags the top-left corner and keeps the bottom-right corner fixed", () => {
    const r = resizeItem(item, { sx: -1, sy: -1 }, { x: 500, y: 700 }).patch;
    expect(r).toEqual({ x: 950, y: 950, width: 900, depth: 500 });
  });

  it("snaps to the grid and respects minimum size", () => {
    expect(resizeItem(item, { sx: 1, sy: 0 }, { x: 1404, y: 0 }).patch.width).toBe(800);
    const tiny = resizeItem(item, { sx: 1, sy: 1 }, { x: 0, y: 0 }).patch;
    expect(tiny.width).toBe(50);
    expect(tiny.depth).toBe(20);
    // 너무 줄여도 반대쪽 변은 그대로
    expect(tiny.x).toBe(600 + 25);
  });

  it("resizes along the item's own axis when rotated", () => {
    const rotated = { ...item, rotation: 90 };
    // 90° 회전: 로컬 +x가 도면 +y. 아래로 끌면 가로가 늘어난다
    const r = resizeItem(rotated, { sx: 1, sy: 0 }, { x: 1000, y: 1600 }).patch;
    expect(r.width).toBe(1000);
    expect(r.depth).toBe(400);
    const before = itemCorners(rotated);
    const after = itemCorners({ ...rotated, ...r });
    // 왼쪽(로컬 -x) 변의 두 꼭짓점은 제자리
    expect(after[0].x).toBeCloseTo(before[0].x);
    expect(after[0].y).toBeCloseTo(before[0].y);
    expect(after[3].x).toBeCloseTo(before[3].x);
    expect(after[3].y).toBeCloseTo(before[3].y);
  });

  const lines = { xs: [1650], ys: [1300] };
  const snap = { lines, threshold: 30 };

  it("snaps the dragged edge to a nearby line and reports a guide", () => {
    // 오른쪽 변을 1630까지 끌면 1650 벽에 붙는다 (왼쪽 변 600은 그대로)
    const r = resizeItem(item, { sx: 1, sy: 0 }, { x: 1630, y: 1000 }, { snap });
    expect(r.patch).toEqual({ x: 1125, y: 1000, width: 1050, depth: 400 });
    expect(r.guides).toEqual({ x: 1650 });
  });

  it("snaps both axes from a corner and ignores far lines", () => {
    const r = resizeItem(item, { sx: 1, sy: 1 }, { x: 1640, y: 1290 }, { snap });
    expect(r.patch.width).toBe(1050);
    expect(r.patch.depth).toBe(500);
    expect(r.guides).toEqual({ x: 1650, y: 1300 });
    const far = resizeItem(item, { sx: 1, sy: 0 }, { x: 1500, y: 1000 }, { snap });
    expect(far.guides).toEqual({});
    expect(far.patch.width).toBe(900);
  });

  it("maps local axes to world axes when rotated by 90°", () => {
    // 90° 회전: 로컬 +x 변이 도면 y로 움직인다. y=1300 선에 붙어야 한다
    const rotated = { ...item, rotation: 90 };
    const r = resizeItem(rotated, { sx: 1, sy: 0 }, { x: 1000, y: 1290 }, { snap });
    expect(r.guides).toEqual({ y: 1300 });
    expect(r.patch.width).toBe(700); // 아래 끝 1300 - 위 끝 600
  });

  it("does not snap when rotated by a non-right angle", () => {
    const r = resizeItem(
      { ...item, rotation: 30 },
      { sx: 1, sy: 0 },
      { x: 1640, y: 1290 },
      { snap },
    );
    expect(r.guides).toEqual({});
  });
});
