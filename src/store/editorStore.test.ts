import { beforeEach, describe, expect, it } from "vitest";
import { ROOM_PRESETS } from "@/catalog/roomPresets";
import { createEmptyDocument } from "@/domain/document";
import { rectPoints } from "@/geometry/roomEdit";
import { useEditorStore } from "@/store/editorStore";

const store = useEditorStore;

beforeEach(() => {
  store.setState({
    doc: createEmptyDocument(),
    past: [],
    future: [],
    txBase: null,
    selection: null,
  });
});

describe("editor store", () => {
  it("adds a room and undoes/redoes it", () => {
    store.getState().addRoom("방", rectPoints(0, 0, 3000, 3000));
    expect(store.getState().doc.floorplan.rooms).toHaveLength(1);

    store.getState().undo();
    expect(store.getState().doc.floorplan.rooms).toHaveLength(0);

    store.getState().redo();
    expect(store.getState().doc.floorplan.rooms).toHaveLength(1);
  });

  it("groups a drag into a single history entry", () => {
    const id = store.getState().addRoom("방", rectPoints(0, 0, 3000, 3000));
    const base = store.getState().doc.floorplan.rooms[0].points;

    store.getState().beginTransaction();
    for (let i = 1; i <= 5; i++) store.getState().moveRoom(id, base, { x: i * 100, y: 0 });
    store.getState().endTransaction();

    expect(store.getState().doc.floorplan.rooms[0].points[0]).toEqual({ x: 500, y: 0 });
    expect(store.getState().past).toHaveLength(2); // 방 추가 + 드래그 1회

    store.getState().undo();
    expect(store.getState().doc.floorplan.rooms[0].points[0]).toEqual({ x: 0, y: 0 });
  });

  it("rejects self-intersecting polygons", () => {
    const id = store.getState().addRoom("방", rectPoints(0, 0, 3000, 3000));
    const ok = store.getState().setRoomPoints(id, [
      { x: 0, y: 0 },
      { x: 100, y: 100 },
      { x: 100, y: 0 },
      { x: 0, y: 100 },
    ]);
    expect(ok).toBe(false);
    expect(store.getState().doc.floorplan.rooms[0].points).toHaveLength(4);
  });

  it("replaces the house with a house preset and appends a room preset", () => {
    const twoRoom = ROOM_PRESETS.find((p) => p.id === "two-room")!;
    store.getState().applyPreset(twoRoom);
    expect(store.getState().doc.floorplan.rooms).toHaveLength(4);

    const rect = ROOM_PRESETS.find((p) => p.id === "rect")!;
    store.getState().applyPreset(rect);
    const rooms = store.getState().doc.floorplan.rooms;
    expect(rooms).toHaveLength(5);
    // 기존 방 오른쪽(최대 x 8300 + 1000)에 놓인다
    expect(rooms[4].points[0]).toEqual({ x: 9300, y: 0 });
  });
});
