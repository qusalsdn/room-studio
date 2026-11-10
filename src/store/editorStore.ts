import { produce, type Draft } from "immer";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { RoomPreset } from "@/catalog/roomPresets";
import {
  createEmptyDocument,
  createRoom,
  parseDocument,
  type HouseDocument,
  type Room,
  type Vec2,
} from "@/domain/document";
import { bounds, isSimplePolygon } from "@/geometry/polygon";
import { translatePoints } from "@/geometry/roomEdit";

const HISTORY_LIMIT = 100;

const memoryStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

export type Tool = "select" | "rect";

export type Selection =
  | { kind: "room"; roomId: string }
  | { kind: "edge"; roomId: string; edgeIndex: number }
  | { kind: "vertex"; roomId: string; index: number };

export type Viewport = { scale: number; x: number; y: number };

export type EditorState = {
  doc: HouseDocument;
  past: HouseDocument[];
  future: HouseDocument[];
  /** 드래그처럼 여러 번 바뀌어도 한 번의 실행 취소로 묶을 때의 시작 상태 */
  txBase: HouseDocument | null;

  tool: Tool;
  selection: Selection | null;
  hoveredEdge: { roomId: string; edgeIndex: number } | null;
  viewport: Viewport;
  /** 캔버스가 화면 맞춤을 다시 해야 할 때 증가 */
  fitRequest: number;

  // 히스토리
  apply: (recipe: (draft: Draft<HouseDocument>) => void) => void;
  beginTransaction: () => void;
  endTransaction: () => void;
  cancelTransaction: () => void;
  undo: () => void;
  redo: () => void;

  // 문서 편집
  addRoom: (name: string, points: Vec2[]) => string;
  setRoomPoints: (roomId: string, points: Vec2[]) => boolean;
  moveRoom: (roomId: string, base: Vec2[], delta: Vec2) => void;
  renameRoom: (roomId: string, name: string) => void;
  setRoomColor: (roomId: string, color: string) => void;
  deleteRoom: (roomId: string) => void;
  applyPreset: (preset: RoomPreset) => void;
  setHouseName: (name: string) => void;
  setSettings: (settings: Partial<HouseDocument["settings"]>) => void;
  resetDocument: () => void;

  // UI
  setTool: (tool: Tool) => void;
  select: (selection: Selection | null) => void;
  setHoveredEdge: (edge: EditorState["hoveredEdge"]) => void;
  setViewport: (viewport: Viewport) => void;
  requestFit: () => void;
};

export function findRoom(doc: HouseDocument, roomId: string): Room | undefined {
  return doc.floorplan.rooms.find((r) => r.id === roomId);
}

/** 기존 방들 오른쪽 빈 곳의 왼쪽 위 좌표 */
function freeOrigin(doc: HouseDocument): Vec2 {
  const all = doc.floorplan.rooms.flatMap((r) => r.points);
  if (all.length === 0) return { x: 0, y: 0 };
  const b = bounds(all);
  return { x: b.maxX + 1000, y: b.minY };
}

export const useEditorStore = create<EditorState>()(
  persist(
    (set, get) => ({
      doc: createEmptyDocument(),
      past: [],
      future: [],
      txBase: null,
      tool: "select",
      selection: null,
      hoveredEdge: null,
      viewport: { scale: 0.1, x: 80, y: 80 },
      fitRequest: 0,

      apply: (recipe) => {
        const { doc, txBase, past } = get();
        const next = produce(doc, recipe);
        if (next === doc) return;
        if (txBase) {
          set({ doc: next });
        } else {
          set({ doc: next, past: [...past, doc].slice(-HISTORY_LIMIT), future: [] });
        }
      },
      beginTransaction: () => {
        if (!get().txBase) set({ txBase: get().doc });
      },
      endTransaction: () => {
        const { txBase, doc, past } = get();
        if (!txBase) return;
        if (txBase === doc) {
          set({ txBase: null });
        } else {
          set({ txBase: null, past: [...past, txBase].slice(-HISTORY_LIMIT), future: [] });
        }
      },
      cancelTransaction: () => {
        const { txBase } = get();
        if (txBase) set({ doc: txBase, txBase: null });
      },
      undo: () => {
        const { past, doc, future, txBase } = get();
        if (txBase || past.length === 0) return;
        set({
          doc: past[past.length - 1],
          past: past.slice(0, -1),
          future: [doc, ...future],
          selection: null,
        });
      },
      redo: () => {
        const { past, doc, future, txBase } = get();
        if (txBase || future.length === 0) return;
        set({ doc: future[0], past: [...past, doc], future: future.slice(1), selection: null });
      },

      addRoom: (name, points) => {
        const room = createRoom(name, points, get().doc.floorplan.rooms.length);
        get().apply((d) => {
          d.floorplan.rooms.push(room);
        });
        set({ selection: { kind: "room", roomId: room.id } });
        return room.id;
      },
      setRoomPoints: (roomId, points) => {
        if (!isSimplePolygon(points)) return false;
        get().apply((d) => {
          const room = d.floorplan.rooms.find((r) => r.id === roomId);
          if (room) room.points = points;
        });
        return true;
      },
      moveRoom: (roomId, base, delta) => {
        get().apply((d) => {
          const room = d.floorplan.rooms.find((r) => r.id === roomId);
          if (room) room.points = translatePoints(base, delta);
        });
      },
      renameRoom: (roomId, name) => {
        get().apply((d) => {
          const room = d.floorplan.rooms.find((r) => r.id === roomId);
          if (room) room.name = name;
        });
      },
      setRoomColor: (roomId, color) => {
        get().apply((d) => {
          const room = d.floorplan.rooms.find((r) => r.id === roomId);
          if (room) room.floorColor = color;
        });
      },
      deleteRoom: (roomId) => {
        get().apply((d) => {
          d.floorplan.rooms = d.floorplan.rooms.filter((r) => r.id !== roomId);
          d.floorplan.openings = d.floorplan.openings.filter((o) => o.roomId !== roomId);
        });
        set({ selection: null, hoveredEdge: null });
      },
      applyPreset: (preset) => {
        const { doc } = get();
        if (preset.kind === "house") {
          get().apply((d) => {
            d.floorplan.rooms = preset.rooms.map((r, i) => createRoom(r.name, r.points, i));
            d.floorplan.openings = [];
          });
          set({ selection: null });
        } else {
          const origin = freeOrigin(doc);
          let lastId = "";
          get().apply((d) => {
            preset.rooms.forEach((r, i) => {
              const room = createRoom(
                r.name,
                translatePoints(r.points, origin),
                d.floorplan.rooms.length + i,
              );
              d.floorplan.rooms.push(room);
              lastId = room.id;
            });
          });
          set({ selection: { kind: "room", roomId: lastId } });
        }
        get().requestFit();
      },
      setHouseName: (name) => {
        get().apply((d) => {
          d.name = name;
        });
      },
      setSettings: (settings) => {
        get().apply((d) => {
          Object.assign(d.settings, settings);
        });
      },
      resetDocument: () => {
        get().apply((d) => {
          const fresh = createEmptyDocument(d.name);
          d.floorplan = fresh.floorplan;
          d.layouts = fresh.layouts;
        });
        set({ selection: null });
      },

      setTool: (tool) => set({ tool }),
      select: (selection) => set({ selection }),
      setHoveredEdge: (hoveredEdge) => set({ hoveredEdge }),
      setViewport: (viewport) => set({ viewport }),
      requestFit: () => set({ fitRequest: get().fitRequest + 1 }),
    }),
    {
      name: "room-studio:guest-document",
      version: 1,
      // 서버·테스트 환경(window 없음)에서는 저장하지 않는다
      storage: createJSONStorage(() =>
        typeof window === "undefined" ? memoryStorage : window.localStorage,
      ),
      partialize: (s) => ({ doc: s.doc }),
      merge: (persisted, current) => {
        const doc = parseDocument((persisted as { doc?: unknown } | undefined)?.doc);
        return doc ? { ...current, doc } : current;
      },
    },
  ),
);
