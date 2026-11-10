import type { Vec2 } from "@/domain/document";
import { rectPoints } from "@/geometry/roomEdit";

export type RoomPresetRoom = { name: string; points: Vec2[] };

export type RoomPreset = {
  id: string;
  name: string;
  description: string;
  /** room: 현재 집에 방 하나 추가 / house: 집 전체를 교체 */
  kind: "room" | "house";
  rooms: RoomPresetRoom[];
};

// 방 사이 간격 100mm = 기본 벽 두께
export const ROOM_PRESETS: RoomPreset[] = [
  {
    id: "rect",
    name: "사각형 방",
    description: "360 × 300cm",
    kind: "room",
    rooms: [{ name: "방", points: rectPoints(0, 0, 3600, 3000) }],
  },
  {
    id: "l-shape",
    name: "ㄱ자 방",
    description: "480 × 420cm",
    kind: "room",
    rooms: [
      {
        name: "거실",
        points: [
          { x: 0, y: 0 },
          { x: 4800, y: 0 },
          { x: 4800, y: 2400 },
          { x: 2400, y: 2400 },
          { x: 2400, y: 4200 },
          { x: 0, y: 4200 },
        ],
      },
    ],
  },
  {
    id: "one-room",
    name: "원룸",
    description: "방 + 욕실",
    kind: "house",
    rooms: [
      { name: "방", points: rectPoints(0, 0, 3600, 4800) },
      { name: "욕실", points: rectPoints(3700, 0, 1600, 2000) },
      { name: "현관", points: rectPoints(3700, 2100, 1600, 1200) },
    ],
  },
  {
    id: "two-room",
    name: "투룸",
    description: "거실 + 방 2 + 욕실",
    kind: "house",
    rooms: [
      { name: "거실·주방", points: rectPoints(0, 0, 4800, 3600) },
      { name: "안방", points: rectPoints(4900, 0, 3400, 3600) },
      { name: "작은방", points: rectPoints(0, 3700, 3000, 2800) },
      { name: "욕실", points: rectPoints(3100, 3700, 1700, 2000) },
    ],
  },
];
