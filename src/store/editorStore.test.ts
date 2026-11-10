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

describe("furniture and openings", () => {
  it("adds, duplicates and deletes furniture in the current layout", () => {
    const id = store.getState().addFurniture("bed-queen", { x: 1000, y: 1000 })!;
    expect(store.getState().mode).toBe("furniture");
    store.getState().duplicateFurniture(id);
    const items = store.getState().doc.layouts[0].items;
    expect(items).toHaveLength(2);
    expect(items[1]).toMatchObject({ name: "퀸 침대", x: 1200, y: 1200, width: 1500 });

    store.getState().updateFurniture(id, { rotation: -90 });
    expect(store.getState().doc.layouts[0].items[0].rotation).toBe(270);

    store.getState().deleteFurniture(id);
    expect(store.getState().doc.layouts[0].items).toHaveLength(1);
  });

  it("moves furniture inside a room together with the room", () => {
    const roomId = store.getState().addRoom("방", rectPoints(0, 0, 3000, 3000));
    const itemId = store.getState().addFurniture("desk", { x: 500, y: 500 })!;
    const base = store.getState().doc.floorplan.rooms[0].points;
    store.getState().moveRoom(roomId, base, { x: 1000, y: 0 }, [{ id: itemId, x: 500, y: 500 }]);
    expect(store.getState().doc.layouts[0].items[0]).toMatchObject({ x: 1500, y: 500 });
  });

  it("keeps a door on its wall when the wall length changes", () => {
    const roomId = store.getState().addRoom("방", rectPoints(0, 0, 4000, 3000));
    const doorId = store.getState().addOpening(roomId, 0, "hinged-door")!;
    expect(store.getState().doc.floorplan.openings[0]).toMatchObject({ offset: 1550, width: 900 });

    // 문을 줄이면 offset이 벽 안에 머문다
    store.getState().updateOpening(doorId, { offset: 99999 });
    expect(store.getState().doc.floorplan.openings[0].offset).toBe(3100);

    store.getState().deleteRoom(roomId);
    expect(store.getState().doc.floorplan.openings).toHaveLength(0);
  });
});

describe("custom furniture", () => {
  it("creates an item with the given name and size", () => {
    store
      .getState()
      .addFurniture(
        "custom",
        { x: 0, y: 0 },
        { name: "캣타워", width: 500, depth: 450, height: 1500 },
      );
    expect(store.getState().doc.layouts[0].items[0]).toMatchObject({
      catalogId: "custom",
      name: "캣타워",
      width: 500,
      depth: 450,
      height: 1500,
    });
  });
});
