import { describe, expect, it } from "vitest";
import type { Opening } from "@/domain/document";
import {
  collectSnapLines,
  itemBounds,
  itemCorners,
  snapAngle,
  snapItemPosition,
} from "@/geometry/furniture";
import { doorSwing, openingGeometry, reattachOpenings } from "@/geometry/openings";
import { moveEdge, rectPoints, splitEdge } from "@/geometry/roomEdit";

const rect = rectPoints(0, 0, 4000, 3000);
const door: Opening = {
  id: "d",
  roomId: "r",
  edgeIndex: 0,
  offset: 2500,
  width: 900,
  height: 2100,
  sillHeight: 0,
  kind: "hinged-door",
  swing: { side: "in", hinge: "start" },
};

describe("furniture geometry", () => {
  it("rotates corners and bounds", () => {
    const item = { x: 1000, y: 1000, rotation: 90, width: 2000, depth: 1000 };
    const b = itemBounds(item);
    expect(Math.round(b.minX)).toBe(500);
    expect(Math.round(b.maxX)).toBe(1500);
    expect(b.minY).toBeCloseTo(0);
    expect(Math.round(b.maxY)).toBe(2000);
    expect(itemCorners({ ...item, rotation: 0 })[0]).toEqual({ x: 0, y: 500 });
  });

  it("snaps angles", () => {
    expect(snapAngle(97)).toBe(90);
    expect(snapAngle(-5)).toBe(0);
    expect(snapAngle(-8)).toBe(345);
    expect(snapAngle(355)).toBe(0);
    expect(snapAngle(352)).toBe(345);
  });

  it("snaps an item flush to the nearest wall", () => {
    const lines = collectSnapLines([{ id: "r", name: "", floorColor: "", points: rect }], []);
    const item = { x: 0, y: 0, rotation: 0, width: 1000, depth: 2000 };
    // 왼쪽 면이 x=30 → 벽(x=0)에 붙어야 함
    const r = snapItemPosition(item, { x: 530, y: 1517 }, lines, 100, 10);
    expect(r.position).toEqual({ x: 500, y: 1520 });
    expect(r.guides.x).toBe(0);
    expect(r.guides.y).toBeUndefined();
  });
});

describe("openings", () => {
  it("computes position on the wall", () => {
    const g = openingGeometry(rect, door);
    expect(g.start).toEqual({ x: 2500, y: 0 });
    expect(g.end).toEqual({ x: 3400, y: 0 });
    expect(g.normal).toEqual({ x: 0, y: -1 });
  });

  it("swings a door into the room", () => {
    const s = doorSwing(rect, door, 100);
    expect(s.hinge).toEqual({ x: 2500, y: 0 });
    expect(s.leafEnd).toEqual({ x: 2500, y: 900 });
    const last = s.arc[s.arc.length - 1];
    expect(Math.round(last.x)).toBe(2500);
    expect(Math.round(last.y)).toBe(900);
  });

  it("follows its wall when the room is reshaped", () => {
    // 벽 0을 나누면 문은 오른쪽 절반(새 변 1)으로 옮겨가야 함
    const split = splitEdge(rect, 0, { x: 2000, y: 0 });
    const [moved] = reattachOpenings(rect, split, [door]);
    expect(moved.edgeIndex).toBe(1);
    expect(moved.offset).toBe(500);

    // 벽을 바깥으로 밀어도 같은 벽에 남음
    const pushed = moveEdge(rect, 0, 300);
    const [kept] = reattachOpenings(rect, pushed, [door]);
    expect(kept.edgeIndex).toBe(0);
    expect(openingGeometry(pushed, kept).start).toEqual({ x: 2500, y: -300 });
  });

  it("shrinks or drops openings that no longer fit", () => {
    const narrow = moveEdge(rect, 1, -3400); // 폭 600
    const [shrunk] = reattachOpenings(rect, narrow, [door]);
    expect(shrunk.width).toBe(600);
    expect(shrunk.offset).toBe(0);
  });
});
