import type { HouseDocument, Opening, Room, Vec2 } from "@/domain/document";
import { openingGeometry } from "@/geometry/openings";
import {
  add,
  cross,
  dot,
  edgeAt,
  distance,
  normalize,
  outwardNormal,
  scale,
  signedArea,
  sub,
} from "@/geometry/polygon";

/**
 * 3D 벽 조각. 모두 mm 단위의 평면 좌표(x, y)와 높이(z 대신 h)로 표현한다.
 * 벽 하나를 문·창 구멍을 피해 여러 개의 직육면체로 나눈다.
 */
export type WallBox = {
  /** 바닥 평면에서의 중심 */
  center: Vec2;
  /** 아래에서 위까지 */
  bottom: number;
  top: number;
  /** 벽 방향 길이, 두께 */
  length: number;
  thickness: number;
  /** 평면에서 벽 방향 각도 (라디안, atan2(dir.y, dir.x)) */
  angle: number;
  roomId: string;
};

type Cut = { u0: number; u1: number; v0: number; v1: number };

const PARALLEL = 0.99;
const TOLERANCE = 2; // mm

/** 꼭짓점 i가 볼록(바깥쪽으로 튀어나온) 모서리인지 */
function isConvexCorner(points: Vec2[], i: number): boolean {
  const n = points.length;
  const prev = points[(i - 1 + n) % n];
  const cur = points[i];
  const next = points[(i + 1) % n];
  const turn = cross(sub(cur, prev), sub(next, cur));
  return Math.sign(turn) === Math.sign(signedArea(points));
}

/**
 * 이 벽(방 room의 변 edgeIndex)에 뚫어야 하는 구멍들.
 * 자기 방의 문뿐 아니라, 벽 두께만큼 떨어져 맞닿은 이웃 방의 문도 같은 자리를 뚫는다.
 */
function cutsForWall(
  room: Room,
  edgeIndex: number,
  rooms: Room[],
  openings: Opening[],
  t: number,
  h: number,
): Cut[] {
  const [a, b] = edgeAt(room.points, edgeIndex);
  const dir = normalize(sub(b, a));
  const cuts: Cut[] = [];
  for (const o of openings) {
    const owner = rooms.find((r) => r.id === o.roomId);
    if (!owner) continue;
    const g = openingGeometry(owner.points, o);
    if (Math.abs(dot(dir, g.dir)) < PARALLEL) continue;
    // 문이 붙은 벽 안쪽 면에서 이 벽 안쪽 면까지의 거리 (문의 바깥 방향 기준)
    const d = dot(sub(a, g.start), g.normal);
    if (d < -TOLERANCE || d > t + TOLERANCE) continue;
    // 같은 직선이어야 함: 수직 거리 외에 어긋남이 없는지
    const offsetAlong = Math.abs(cross(dir, sub(g.start, a)));
    if (Math.abs(offsetAlong - Math.abs(d)) > TOLERANCE) continue;
    const s0 = dot(sub(g.start, a), dir);
    const s1 = dot(sub(g.end, a), dir);
    const u0 = Math.min(s0, s1);
    const u1 = Math.max(s0, s1);
    const v0 = o.kind === "window" ? Math.min(o.sillHeight, h) : 0;
    const v1 = Math.min(v0 + o.height, h);
    if (u1 - u0 > 1 && v1 > v0) cuts.push({ u0, u1, v0, v1 });
  }
  return cuts.sort((x, y) => x.u0 - y.u0);
}

export function buildWallBoxes(doc: Pick<HouseDocument, "floorplan" | "settings">): WallBox[] {
  const { rooms, openings } = doc.floorplan;
  const t = doc.settings.wallThickness;
  const h = doc.settings.wallHeight;
  const boxes: WallBox[] = [];

  for (const room of rooms) {
    const n = room.points.length;
    for (let i = 0; i < n; i++) {
      const [a, b] = edgeAt(room.points, i);
      const len = distance(a, b);
      const dir = normalize(sub(b, a));
      const normal = outwardNormal(room.points, i);
      const angle = Math.atan2(dir.y, dir.x);
      // 볼록 모서리는 벽 두께만큼 늘려서 모서리 빈틈을 메운다
      const uMin = isConvexCorner(room.points, i) ? -t : 0;
      const uMax = len + (isConvexCorner(room.points, (i + 1) % n) ? t : 0);

      const push = (u0: number, u1: number, v0: number, v1: number) => {
        if (u1 - u0 < 1 || v1 - v0 < 1) return;
        const mid = add(add(a, scale(dir, (u0 + u1) / 2)), scale(normal, t / 2));
        boxes.push({
          center: mid,
          bottom: v0,
          top: v1,
          length: u1 - u0,
          thickness: t,
          angle,
          roomId: room.id,
        });
      };

      let cursor = uMin;
      for (const c of cutsForWall(room, i, rooms, openings, t, h)) {
        const u0 = Math.max(c.u0, uMin);
        const u1 = Math.min(c.u1, uMax);
        if (u1 <= cursor) continue;
        const start = Math.max(u0, cursor);
        push(cursor, start, 0, h);
        push(start, u1, 0, c.v0); // 창 아래
        push(start, u1, c.v1, h); // 문·창 위
        cursor = u1;
      }
      push(cursor, uMax, 0, h);
    }
  }
  return boxes;
}

/** 문 아래 벽 두께 부분의 바닥 (문턱) */
export function doorThresholds(doc: Pick<HouseDocument, "floorplan" | "settings">) {
  const t = doc.settings.wallThickness;
  return doc.floorplan.openings
    .filter((o) => o.kind !== "window")
    .flatMap((o) => {
      const room = doc.floorplan.rooms.find((r) => r.id === o.roomId);
      if (!room) return [];
      const g = openingGeometry(room.points, o);
      const out = scale(g.normal, t);
      return [
        {
          id: o.id,
          color: room.floorColor,
          points: [g.start, g.end, add(g.end, out), add(g.start, out)],
        },
      ];
    });
}
