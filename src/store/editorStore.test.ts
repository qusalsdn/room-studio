import { beforeEach, describe, expect, it } from "vitest";
import { ROOM_PRESETS } from "@/catalog/roomPresets";
import { autoArrange } from "@/domain/autoArrange";
import { createEmptyDocument } from "@/domain/document";
import { rectPoints } from "@/geometry/roomEdit";
import { activeLayout, useEditorStore } from "@/store/editorStore";

const store = useEditorStore;

beforeEach(() => {
  store.setState({
    doc: createEmptyDocument(),
    past: [],
    future: [],
    txBase: null,
    selection: null,
    projectId: null,
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

describe("cloud projects", () => {
  it("loads a project with fresh history and returns to the guest document", () => {
    store.getState().addRoom("게스트 방", rectPoints(0, 0, 3000, 3000));
    const cloud = createEmptyDocument("클라우드 집");
    store.getState().loadProject("p1", cloud);
    expect(store.getState()).toMatchObject({ projectId: "p1", past: [], saveStatus: "saved" });
    expect(store.getState().doc.name).toBe("클라우드 집");

    // 테스트 환경에는 localStorage가 없으므로 빈 게스트 문서로 돌아온다
    store.getState().openGuest();
    expect(store.getState().projectId).toBeNull();
    expect(store.getState().doc.name).toBe("우리 집");
  });
});

describe("layouts", () => {
  it("copies, switches, renames, marks current and deletes layouts", () => {
    const s = () => store.getState();
    const bed = s().addFurniture("bed-queen", { x: 1000, y: 1000 })!;
    const baseId = s().doc.layouts[0].id;

    const a = s().addLayout();
    expect(s().doc.layouts.map((l) => l.name)).toEqual(["현재 배치", "배치안 A"]);
    expect(s().doc.editingLayoutId).toBe(a);
    // 복제본은 같은 가구 id를 가진다 → 비교할 때 같은 가구로 인식
    expect(s().doc.layouts[1].items[0].id).toBe(bed);

    // 배치안 A에서만 침대를 옮긴다
    s().updateFurniture(bed, { x: 3000 });
    expect(s().doc.layouts[0].items[0].x).toBe(1000);
    expect(s().doc.layouts[1].items[0].x).toBe(3000);

    // 전환은 실행 취소 기록에 남지 않는다
    const pastLength = s().past.length;
    s().switchLayout(baseId);
    expect(s().past.length).toBe(pastLength);
    expect(activeLayout(s().doc).id).toBe(baseId);

    s().renameLayout(a, "침대 창가로");
    s().setCurrentLayout(a);
    expect(s().doc.layouts.map((l) => [l.name, l.isCurrent])).toEqual([
      ["현재 배치", false],
      ["침대 창가로", true],
    ]);

    s().deleteLayout(a);
    expect(s().doc.layouts).toHaveLength(1);
    expect(s().doc.layouts[0].isCurrent).toBe(true);
    s().deleteLayout(baseId); // 마지막 하나는 지울 수 없음
    expect(s().doc.layouts).toHaveLength(1);
  });

  it("auto-arranges into a new layout and leaves the source untouched", () => {
    const s = () => store.getState();
    s().addRoom("방", rectPoints(0, 0, 4000, 3000));
    const bed = s().addFurniture("bed-queen", { x: 2000, y: 1500 })!;
    s().addFurniture("drawer", { x: 2000, y: 1500 });
    const before = structuredClone(s().doc.layouts[0].items);

    const arrange = () => autoArrange(s().doc, activeLayout(s().doc).items);
    const { items, unplaced } = arrange();
    expect(unplaced).toEqual([]);
    const layoutId = s().addArrangedLayout(items);
    expect(s().doc.layouts.map((l) => l.name)).toEqual(["현재 배치", "자동 배치 1"]);
    expect(s().doc.editingLayoutId).toBe(layoutId);
    expect(s().doc.layouts[0].items).toEqual(before);
    // 같은 가구 id를 이어 써서 비교할 수 있다
    expect(activeLayout(s().doc).items.map((i) => i.id)).toContain(bed);
    expect(activeLayout(s().doc).items).not.toEqual(before);

    // 자동 배치한 배치안에서 다시 돌리면 이름이 겹치지 않는다
    s().addArrangedLayout(arrange().items);
    expect(s().doc.layouts.at(-1)!.name).toBe("자동 배치 2");

    // 한 번의 실행 취소로 되돌린다
    s().undo();
    s().undo();
    expect(s().doc.layouts).toHaveLength(1);
  });

  it("rotates the whole house 90° with furniture in every layout", () => {
    const s = store.getState;
    const roomId = s().addRoom("방", rectPoints(0, 0, 4000, 2000));
    const doorId = s().addOpening(roomId, 0, "hinged-door")!;
    const bed = s().addFurniture("bed-queen", { x: 1000, y: 500 })!;
    const other = s().addLayout();
    s().switchLayout(other);

    s().rotateHouse(1);
    const doc = s().doc;
    // 중심 (2000, 1000) 기준 시계방향: (0,0) → (3000,-1000)
    expect(doc.floorplan.rooms[0].points).toEqual([
      { x: 3000, y: -1000 },
      { x: 3000, y: 3000 },
      { x: 1000, y: 3000 },
      { x: 1000, y: -1000 },
    ]);
    expect(doc.floorplan.openings.find((o) => o.id === doorId)?.edgeIndex).toBe(0);
    for (const layout of doc.layouts) {
      const item = layout.items.find((i) => i.id === bed)!;
      expect({ x: item.x, y: item.y, rotation: item.rotation }).toEqual({
        x: 2500,
        y: 0,
        rotation: 90,
      });
    }

    s().rotateHouse(-1);
    expect(s().doc.floorplan.rooms[0].points).toEqual(rectPoints(0, 0, 4000, 2000));
    s().undo();
    s().undo();
    expect(s().doc.floorplan.rooms[0].points).toEqual(rectPoints(0, 0, 4000, 2000));
  });
});
