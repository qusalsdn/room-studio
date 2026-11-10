import { describe, expect, it } from "vitest";
import type { Opening, Room } from "@/domain/document";
import { rectPoints } from "@/geometry/roomEdit";
import { buildWallBoxes } from "@/geometry/walls3d";

const settings = { wallThickness: 100, wallHeight: 2400, displayUnit: "cm" as const };
const room = (id: string, x: number, w: number): Room => ({
  id,
  name: id,
  floorColor: "#fff",
  points: rectPoints(x, 0, w, 3000),
});
const door = (roomId: string, edgeIndex: number, offset: number): Opening => ({
  id: `d-${roomId}`,
  roomId,
  edgeIndex,
  offset,
  width: 900,
  height: 2100,
  sillHeight: 0,
  kind: "hinged-door",
  swing: { side: "in", hinge: "start" },
});

describe("buildWallBoxes", () => {
  it("builds one box per wall and fills convex corners", () => {
    const boxes = buildWallBoxes({
      settings,
      floorplan: { rooms: [room("a", 0, 4000)], openings: [] },
    });
    expect(boxes).toHaveLength(4);
    // 윗벽: 길이 4000 + 양쪽 모서리 100씩
    expect(boxes[0]).toMatchObject({ length: 4200, bottom: 0, top: 2400 });
    expect(boxes[0].center).toEqual({ x: 2000, y: -50 });
  });

  it("splits a wall around a door", () => {
    const boxes = buildWallBoxes({
      settings,
      floorplan: { rooms: [room("a", 0, 4000)], openings: [door("a", 0, 1000)] },
    });
    const top = boxes.filter((b) => Math.abs(b.center.y + 50) < 1);
    // 문 왼쪽, 문 위 상인방, 문 오른쪽
    expect(top.map((b) => [Math.round(b.length), b.bottom, b.top])).toEqual([
      [1100, 0, 2400],
      [900, 2100, 2400],
      [2200, 0, 2400],
    ]);
  });

  it("also cuts the neighbouring room's wall behind a door", () => {
    // a의 오른쪽 벽(x=4000)과 b의 왼쪽 벽(x=4100) 사이가 벽 두께 100
    const rooms = [room("a", 0, 4000), room("b", 4100, 3000)];
    const boxes = buildWallBoxes({
      settings,
      floorplan: { rooms, openings: [door("a", 1, 1000)] },
    });
    const bLeft = boxes.filter((b) => b.roomId === "b" && Math.abs(b.center.x - 4050) < 1);
    expect(bLeft.length).toBe(3);
    expect(bLeft.some((b) => b.bottom === 2100)).toBe(true);
  });
});
