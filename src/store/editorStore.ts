import { produce, type Draft } from "immer";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { findCatalogItem } from "@/catalog/furniture";
import type { RoomPreset } from "@/catalog/roomPresets";
import {
  createEmptyDocument,
  createRoom,
  newId,
  parseDocument,
  type FurnitureItem,
  type HouseDocument,
  type Layout,
  type Opening,
  type Room,
  type Vec2,
} from "@/domain/document";
import { autoArrange, type ArrangeOptions } from "@/domain/autoArrange";
import { nextLayoutName } from "@/domain/layoutDiff";
import { normalizeAngle } from "@/geometry/furniture";
import {
  MIN_OPENING_WIDTH,
  OPENING_DEFAULTS,
  clampOffset,
  reattachOpenings,
} from "@/geometry/openings";
import { bounds, edgeLength, isSimplePolygon } from "@/geometry/polygon";
import { rotatePoint90, translatePoints } from "@/geometry/roomEdit";

const HISTORY_LIMIT = 100;

const memoryStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

export const GUEST_STORAGE_KEY = "room-studio:guest-document";

/**
 * 게스트 문서만 localStorage에 저장한다.
 * 클라우드 프로젝트(projectId 있음)를 여는 동안에는 쓰지 않아 게스트 저장본을 덮지 않는다.
 */
const guestStorage = {
  getItem: (name: string) => window.localStorage.getItem(name),
  setItem: (name: string, value: string) => {
    if (useEditorStore.getState().projectId) return;
    window.localStorage.setItem(name, value);
  },
  removeItem: (name: string) => window.localStorage.removeItem(name),
};

export type SaveStatus = "saved" | "dirty" | "saving" | "error";

export type Tool = "select" | "rect";

/** structure: 방·벽·문 편집 / furniture: 가구 배치 (구조는 잠김) */
export type EditorMode = "structure" | "furniture";

export type ViewMode = "2d" | "3d" | "split" | "compare";

export type Selection =
  | { kind: "room"; roomId: string }
  | { kind: "edge"; roomId: string; edgeIndex: number }
  | { kind: "vertex"; roomId: string; index: number }
  | { kind: "opening"; roomId: string; openingId: string }
  | { kind: "furniture"; itemId: string };

export function selectedRoomId(sel: Selection | null): string | undefined {
  return sel && "roomId" in sel ? sel.roomId : undefined;
}

export type ItemPosition = { id: string; x: number; y: number };

export type Viewport = { scale: number; x: number; y: number };

export type EditorState = {
  /** 클라우드 프로젝트 id. null이면 브라우저에 저장되는 게스트 문서 */
  projectId: string | null;
  saveStatus: SaveStatus;
  doc: HouseDocument;
  past: HouseDocument[];
  future: HouseDocument[];
  /** 드래그처럼 여러 번 바뀌어도 한 번의 실행 취소로 묶을 때의 시작 상태 */
  txBase: HouseDocument | null;

  mode: EditorMode;
  view: ViewMode;
  /** 충돌·동선 경고를 도면에 표시 */
  showWarnings: boolean;
  /** 경고 목록에서 마우스를 올린 경고 (도면에서 강조) */
  focusedWarningId: string | null;
  /** 열려 있는 도움말 창 */
  help: "guide" | "shortcuts" | null;
  tool: Tool;
  selection: Selection | null;
  hoveredEdge: { roomId: string; edgeIndex: number } | null;
  viewport: Viewport;
  /** 캔버스가 화면 맞춤을 다시 해야 할 때 증가 */
  fitRequest: number;

  /** 클라우드 프로젝트 문서를 연다 (실행 취소 기록 초기화) */
  loadProject: (projectId: string, doc: HouseDocument) => void;
  /** 게스트 문서로 돌아온다 (localStorage에서 다시 읽음) */
  openGuest: () => void;
  setSaveStatus: (status: SaveStatus) => void;

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
  /** items: 방과 함께 옮길 가구들의 드래그 시작 위치 */
  moveRoom: (roomId: string, base: Vec2[], delta: Vec2, items?: ItemPosition[]) => void;
  renameRoom: (roomId: string, name: string) => void;
  setRoomColor: (roomId: string, color: string) => void;
  deleteRoom: (roomId: string) => void;
  applyPreset: (preset: RoomPreset) => void;
  /** 집 전체(방·문·창·모든 배치안의 가구)를 90° 회전. dir 1 = 시계방향 */
  rotateHouse: (dir: 1 | -1) => void;
  setHouseName: (name: string) => void;
  setSettings: (settings: Partial<HouseDocument["settings"]>) => void;
  resetDocument: () => void;

  // 문·창문
  addOpening: (roomId: string, edgeIndex: number, kind: Opening["kind"]) => string | null;
  updateOpening: (openingId: string, patch: Partial<Omit<Opening, "id" | "roomId">>) => void;
  deleteOpening: (openingId: string) => void;

  // 가구 (현재 배치안)
  addFurniture: (
    catalogId: string,
    at: Vec2,
    overrides?: Partial<Pick<FurnitureItem, "name" | "width" | "depth" | "height">>,
  ) => string | null;
  updateFurniture: (itemId: string, patch: Partial<Omit<FurnitureItem, "id">>) => void;
  duplicateFurniture: (itemId: string) => void;
  deleteFurniture: (itemId: string) => void;

  // 배치안
  /** 다른 배치안으로 전환 (실행 취소 기록에 남지 않음) */
  switchLayout: (layoutId: string) => void;
  /** fromId 배치안을 복제해 새 배치안을 만들고 그쪽으로 전환 (가구 id는 그대로 이어짐) */
  addLayout: (fromId?: string) => string;
  /** 보고 있는 배치안을 자동 배치해서 새 배치안으로 만들고 그 배치안으로 바꾼다 */
  autoArrangeLayout: (options?: ArrangeOptions) => { layoutId: string; unplaced: string[] };
  renameLayout: (layoutId: string, name: string) => void;
  deleteLayout: (layoutId: string) => void;
  /** 실제 지금 집의 배치로 지정 */
  setCurrentLayout: (layoutId: string) => void;

  // UI
  setMode: (mode: EditorMode) => void;
  setView: (view: ViewMode) => void;
  setShowWarnings: (show: boolean) => void;
  setFocusedWarning: (id: string | null) => void;
  setHelp: (help: EditorState["help"]) => void;
  setTool: (tool: Tool) => void;
  select: (selection: Selection | null) => void;
  setHoveredEdge: (edge: EditorState["hoveredEdge"]) => void;
  setViewport: (viewport: Viewport) => void;
  requestFit: () => void;
};

export function findRoom(doc: HouseDocument, roomId: string): Room | undefined {
  return doc.floorplan.rooms.find((r) => r.id === roomId);
}

type WithLayouts = { layouts: Layout[]; editingLayoutId?: string };

/** 실제 지금 집의 배치 ("현재 배치" 표시가 된 것, 없으면 첫 번째). 목록 미리보기·공유에 쓴다 */
export function currentLayout<T extends WithLayouts>(doc: T): T["layouts"][number] {
  return doc.layouts.find((l) => l.isCurrent) ?? doc.layouts[0];
}

/** 편집기에서 지금 고치고 있는 배치안 */
export function activeLayout<T extends WithLayouts>(doc: T): T["layouts"][number] {
  return doc.layouts.find((l) => l.id === doc.editingLayoutId) ?? currentLayout(doc);
}

export function findItem(doc: HouseDocument, itemId: string): FurnitureItem | undefined {
  return activeLayout(doc).items.find((i) => i.id === itemId);
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
      projectId: null,
      saveStatus: "saved",
      doc: createEmptyDocument(),
      past: [],
      future: [],
      txBase: null,
      mode: "structure",
      view: "2d",
      showWarnings: true,
      focusedWarningId: null,
      help: null,
      tool: "select",
      selection: null,
      hoveredEdge: null,
      viewport: { scale: 0.1, x: 80, y: 80 },
      fitRequest: 0,

      loadProject: (projectId, doc) => {
        set({
          projectId,
          doc,
          past: [],
          future: [],
          txBase: null,
          selection: null,
          hoveredEdge: null,
          mode: "structure",
          tool: "select",
          saveStatus: "saved",
        });
        get().requestFit();
      },
      openGuest: () => {
        if (get().projectId === null) return;
        // 문서와 projectId를 한 번에 바꿔야 클라우드 문서가 게스트 저장본에 써지지 않는다
        set({
          doc: readStoredGuestDocument() ?? createEmptyDocument(),
          projectId: null,
          past: [],
          future: [],
          txBase: null,
          selection: null,
          saveStatus: "saved",
        });
        get().requestFit();
      },
      setSaveStatus: (saveStatus) => set({ saveStatus }),

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
          if (!room) return;
          // 문·창이 붙은 벽을 새 모양에서 다시 찾는다
          const mine = d.floorplan.openings.filter((o) => o.roomId === roomId);
          if (mine.length > 0) {
            const moved = reattachOpenings(room.points, points, mine as Opening[]);
            d.floorplan.openings = [
              ...d.floorplan.openings.filter((o) => o.roomId !== roomId),
              ...moved,
            ];
          }
          room.points = points;
        });
        return true;
      },
      moveRoom: (roomId, base, delta, items = []) => {
        get().apply((d) => {
          const room = d.floorplan.rooms.find((r) => r.id === roomId);
          if (room) room.points = translatePoints(base, delta);
          const layout = activeLayout(d);
          for (const p of items) {
            const item = layout.items.find((i) => i.id === p.id);
            if (item) {
              item.x = Math.round(p.x + delta.x);
              item.y = Math.round(p.y + delta.y);
            }
          }
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
      rotateHouse: (dir) => {
        const rooms = get().doc.floorplan.rooms;
        if (rooms.length === 0) return;
        const b = bounds(rooms.flatMap((r) => r.points));
        const center = {
          x: Math.round((b.minX + b.maxX) / 2),
          y: Math.round((b.minY + b.maxY) / 2),
        };
        // 점 순서와 방향이 그대로라 문·창(변 번호·거리·경첩)은 손댈 필요 없다
        get().apply((d) => {
          for (const room of d.floorplan.rooms) {
            room.points = room.points.map((p) => rotatePoint90(p, center, dir));
          }
          for (const layout of d.layouts) {
            for (const item of layout.items) {
              const p = rotatePoint90(item, center, dir);
              item.x = p.x;
              item.y = p.y;
              item.rotation = normalizeAngle(item.rotation + dir * 90);
            }
          }
        });
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
          d.editingLayoutId = undefined;
        });
        set({ selection: null });
      },

      addOpening: (roomId, edgeIndex, kind) => {
        const room = findRoom(get().doc, roomId);
        if (!room) return null;
        const len = edgeLength(room.points, edgeIndex);
        if (len < MIN_OPENING_WIDTH) return null;
        const defaults = OPENING_DEFAULTS[kind];
        const width = Math.min(defaults.width, Math.floor(len));
        const opening: Opening = {
          id: newId(),
          roomId,
          edgeIndex,
          offset: clampOffset(len, width, (len - width) / 2),
          ...defaults,
          width,
          kind,
          swing: { side: "in", hinge: "start" },
        };
        get().apply((d) => {
          d.floorplan.openings.push(opening);
        });
        set({ selection: { kind: "opening", roomId, openingId: opening.id } });
        return opening.id;
      },
      updateOpening: (openingId, patch) => {
        get().apply((d) => {
          const o = d.floorplan.openings.find((x) => x.id === openingId);
          const room = o && d.floorplan.rooms.find((r) => r.id === o.roomId);
          if (!o || !room) return;
          Object.assign(o, patch);
          if (patch.kind && !patch.width) {
            Object.assign(o, OPENING_DEFAULTS[patch.kind]);
          }
          const len = edgeLength(room.points, o.edgeIndex);
          o.width = Math.max(MIN_OPENING_WIDTH, Math.min(o.width, Math.floor(len)));
          o.offset = clampOffset(len, o.width, o.offset);
        });
      },
      deleteOpening: (openingId) => {
        get().apply((d) => {
          d.floorplan.openings = d.floorplan.openings.filter((o) => o.id !== openingId);
        });
        set({ selection: null });
      },

      addFurniture: (catalogId, at, overrides = {}) => {
        const c = findCatalogItem(catalogId);
        if (!c) return null;
        const item: FurnitureItem = {
          id: newId(),
          catalogId,
          name: c.name,
          x: Math.round(at.x),
          y: Math.round(at.y),
          rotation: 0,
          width: c.width,
          depth: c.depth,
          height: c.height,
          color: c.color,
          ...overrides,
        };
        get().apply((d) => {
          activeLayout(d).items.push(item);
        });
        set({
          selection: { kind: "furniture", itemId: item.id },
          mode: "furniture",
          tool: "select",
        });
        return item.id;
      },
      updateFurniture: (itemId, patch) => {
        get().apply((d) => {
          const item = activeLayout(d).items.find((i) => i.id === itemId);
          if (!item) return;
          Object.assign(item, patch);
          if (patch.rotation !== undefined) item.rotation = normalizeAngle(patch.rotation);
          if (patch.x !== undefined) item.x = Math.round(patch.x);
          if (patch.y !== undefined) item.y = Math.round(patch.y);
        });
      },
      duplicateFurniture: (itemId) => {
        const src = findItem(get().doc, itemId);
        if (!src) return;
        const copy = { ...src, id: newId(), x: src.x + 200, y: src.y + 200 };
        get().apply((d) => {
          activeLayout(d).items.push(copy);
        });
        set({ selection: { kind: "furniture", itemId: copy.id } });
      },
      switchLayout: (layoutId) => {
        const { doc } = get();
        if (!doc.layouts.some((l) => l.id === layoutId) || activeLayout(doc).id === layoutId)
          return;
        set({ doc: { ...doc, editingLayoutId: layoutId }, selection: null });
      },
      addLayout: (fromId) => {
        const { doc } = get();
        const source = doc.layouts.find((l) => l.id === fromId) ?? activeLayout(doc);
        const layout: Layout = {
          id: newId(),
          name: nextLayoutName(doc.layouts.map((l) => l.name)),
          isCurrent: false,
          items: source.items.map((i) => ({ ...i })),
        };
        get().apply((d) => {
          d.layouts.push(layout);
          d.editingLayoutId = layout.id;
        });
        set({ selection: null });
        return layout.id;
      },
      autoArrangeLayout: (options) => {
        const { doc } = get();
        const source = activeLayout(doc);
        const result = autoArrange(doc, source.items, options);
        const used = new Set(doc.layouts.map((l) => l.name));
        let n = 1;
        while (used.has(`자동 배치 ${n}`)) n++;
        const layout: Layout = {
          id: newId(),
          name: `자동 배치 ${n}`,
          isCurrent: false,
          items: result.items,
        };
        get().apply((d) => {
          d.layouts.push(layout);
          d.editingLayoutId = layout.id;
        });
        set({ selection: null });
        return { layoutId: layout.id, unplaced: result.unplaced };
      },
      renameLayout: (layoutId, name) => {
        get().apply((d) => {
          const l = d.layouts.find((x) => x.id === layoutId);
          if (l) l.name = name;
        });
      },
      deleteLayout: (layoutId) => {
        if (get().doc.layouts.length <= 1) return;
        get().apply((d) => {
          const removed = d.layouts.find((l) => l.id === layoutId);
          d.layouts = d.layouts.filter((l) => l.id !== layoutId);
          if (removed?.isCurrent) d.layouts[0].isCurrent = true;
          if (d.editingLayoutId === layoutId) d.editingLayoutId = undefined;
        });
        set({ selection: null });
      },
      setCurrentLayout: (layoutId) => {
        get().apply((d) => {
          for (const l of d.layouts) l.isCurrent = l.id === layoutId;
        });
      },
      deleteFurniture: (itemId) => {
        get().apply((d) => {
          const layout = activeLayout(d);
          layout.items = layout.items.filter((i) => i.id !== itemId);
        });
        set({ selection: null });
      },

      setMode: (mode) => set({ mode, tool: "select", selection: null, hoveredEdge: null }),
      setView: (view) => set({ view }),
      setShowWarnings: (showWarnings) => set({ showWarnings }),
      setFocusedWarning: (focusedWarningId) => set({ focusedWarningId }),
      setHelp: (help) => set({ help }),
      setTool: (tool) => set({ tool }),
      select: (selection) => set({ selection }),
      setHoveredEdge: (hoveredEdge) => set({ hoveredEdge }),
      setViewport: (viewport) => set({ viewport }),
      requestFit: () => set({ fitRequest: get().fitRequest + 1 }),
    }),
    {
      name: GUEST_STORAGE_KEY,
      version: 1,
      // 서버·테스트 환경(window 없음)에서는 저장하지 않는다
      storage: createJSONStorage(() =>
        typeof window === "undefined" ? memoryStorage : guestStorage,
      ),
      partialize: (s) => ({ doc: s.doc }),
      merge: (persisted, current) => {
        const doc = parseDocument((persisted as { doc?: unknown } | undefined)?.doc);
        return doc ? { ...current, doc } : current;
      },
    },
  ),
);

function readStoredGuestDocument(): HouseDocument | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = JSON.parse(window.localStorage.getItem(GUEST_STORAGE_KEY) ?? "null");
    return parseDocument(raw?.state?.doc);
  } catch {
    return null;
  }
}

/** 이 브라우저에 저장된 게스트 문서 (방이나 가구가 하나라도 있을 때만) */
export function readGuestDocument(): HouseDocument | null {
  const doc = readStoredGuestDocument();
  if (!doc) return null;
  const hasContent = doc.floorplan.rooms.length > 0 || doc.layouts.some((l) => l.items.length > 0);
  return hasContent ? doc : null;
}

/** 게스트 문서를 비운다 (계정으로 옮긴 뒤) */
export function clearGuestDocument() {
  const s = useEditorStore.getState();
  if (s.projectId === null) {
    useEditorStore.setState({ doc: createEmptyDocument(), past: [], future: [], selection: null });
  }
  window.localStorage.removeItem(GUEST_STORAGE_KEY);
}
