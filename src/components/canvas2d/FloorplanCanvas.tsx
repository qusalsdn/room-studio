"use client";

import type { KonvaEventObject } from "konva/lib/Node";
import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import { Circle, Group, Layer, Line, Rect, Stage, Text } from "react-konva";
import type { Room, Vec2 } from "@/domain/document";
import {
  bounds,
  centroid,
  closestPointOnSegment,
  distance,
  dot,
  edgeAt,
  edgeAxis,
  offsetPolygon,
  outwardNormal,
  pointInPolygon,
  polygonArea,
  snapPoint,
  snapValue,
  sub,
} from "@/geometry/polygon";
import {
  moveEdge,
  moveVertex,
  rectPoints,
  removeDuplicatePoints,
  splitEdge,
} from "@/geometry/roomEdit";
import { FURNITURE_DRAG_TYPE, symbolOf } from "@/catalog/furniture";
import {
  collectSnapLines,
  itemLabelPoint,
  normalizeAngle,
  snapAngle,
  snapItemPosition,
  type SnapLines,
} from "@/geometry/furniture";
import { offsetForCenter } from "@/geometry/openings";
import { formatArea, formatLength } from "@/lib/format";
import {
  activeLayout,
  findItem,
  findRoom,
  selectedRoomId,
  useEditorStore,
  type ItemPosition,
  type Viewport,
} from "@/store/editorStore";
import { COLORS, MAX_SCALE, MIN_RECT_SIZE, MIN_SCALE, SNAP_STEP } from "./constants";
import { FurnitureShape } from "./FurnitureShape";
import { Grid } from "./Grid";
import { OpeningShape } from "./OpeningShape";
import { WarningOverlay } from "./WarningOverlay";
import { useWarnings } from "@/components/editor/useWarnings";

const ITEM_GRID = 10; // 가구는 1cm 단위
const SNAP_PX = 10; // 벽·가구에 붙는 거리 (화면 px)

type DragState =
  | { kind: "pan"; startScreen: Vec2; startViewport: Viewport }
  | { kind: "room"; roomId: string; base: Vec2[]; start: Vec2; items: ItemPosition[] }
  | { kind: "opening"; openingId: string; roomId: string }
  | { kind: "item"; itemId: string; grab: Vec2; lines: SnapLines }
  | { kind: "rotate"; itemId: string; center: Vec2 }
  | { kind: "vertex"; roomId: string; index: number; base: Vec2[] }
  | { kind: "edge"; roomId: string; edgeIndex: number; base: Vec2[]; start: Vec2; normal: Vec2 }
  | { kind: "rect"; start: Vec2 };

const flat = (points: Vec2[]) => points.flatMap((p) => [p.x, p.y]);
const clampScale = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));

function toWorld(screen: Vec2, vp: Viewport): Vec2 {
  return { x: (screen.x - vp.x) / vp.scale, y: (screen.y - vp.y) / vp.scale };
}

function edgeCursor(a: Vec2, b: Vec2): string {
  const axis = edgeAxis(a, b);
  if (axis === "horizontal") return "ns-resize";
  if (axis === "vertical") return "ew-resize";
  return "move";
}

export default function FloorplanCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [rectPreview, setRectPreview] = useState<{ a: Vec2; b: Vec2 } | null>(null);
  const [hoverCursor, setHoverCursor] = useState("default");
  const [panning, setPanning] = useState(false);
  const [guides, setGuides] = useState<{ x?: number; y?: number } | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const spaceRef = useRef(false);
  const didInitialFit = useRef(false);

  const doc = useEditorStore((s) => s.doc);
  const viewport = useEditorStore((s) => s.viewport);
  const tool = useEditorStore((s) => s.tool);
  const mode = useEditorStore((s) => s.mode);
  const showWarnings = useEditorStore((s) => s.showWarnings);
  const focusedWarningId = useEditorStore((s) => s.focusedWarningId);
  const warnings = useWarnings();
  const selection = useEditorStore((s) => s.selection);
  const hoveredEdge = useEditorStore((s) => s.hoveredEdge);
  const fitRequest = useEditorStore((s) => s.fitRequest);

  const { rooms, openings } = doc.floorplan;
  const { items } = activeLayout(doc);
  const { wallThickness, displayUnit } = doc.settings;
  const structureMode = mode === "structure";
  const selRoomId = selectedRoomId(selection);
  const selectedRoom =
    structureMode && selRoomId ? rooms.find((r) => r.id === selRoomId) : undefined;
  const selectedItemId = selection?.kind === "furniture" ? selection.itemId : undefined;

  // 컨테이너 크기 추적
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width: Math.floor(width), height: Math.floor(height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fit = useCallback(() => {
    const s = useEditorStore.getState();
    const pts = s.doc.floorplan.rooms.flatMap((r) => r.points);
    if (pts.length === 0 || size.width === 0) return;
    const b = bounds(pts);
    const t = s.doc.settings.wallThickness;
    const pad = 72;
    const w = b.maxX - b.minX + t * 2;
    const h = b.maxY - b.minY + t * 2;
    const scale = clampScale(Math.min((size.width - pad * 2) / w, (size.height - pad * 2) / h));
    s.setViewport({
      scale,
      x: size.width / 2 - ((b.minX + b.maxX) / 2) * scale,
      y: size.height / 2 - ((b.minY + b.maxY) / 2) * scale,
    });
  }, [size.width, size.height]);

  useEffect(() => {
    if (size.width > 0 && !didInitialFit.current) {
      didInitialFit.current = true;
      fit();
    }
  }, [size.width, fit]);

  useEffect(() => {
    if (fitRequest > 0) fit();
  }, [fitRequest, fit]);

  // 드래그 처리 (캔버스 밖으로 나가도 이어지도록 window에서 받는다)
  useEffect(() => {
    const screenOf = (evt: PointerEvent): Vec2 => {
      const r = containerRef.current!.getBoundingClientRect();
      return { x: evt.clientX - r.left, y: evt.clientY - r.top };
    };

    const onMove = (evt: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const s = useEditorStore.getState();
      const screen = screenOf(evt);
      const world = toWorld(screen, s.viewport);
      const step = evt.altKey ? 1 : SNAP_STEP;

      switch (drag.kind) {
        case "pan":
          s.setViewport({
            ...drag.startViewport,
            x: drag.startViewport.x + screen.x - drag.startScreen.x,
            y: drag.startViewport.y + screen.y - drag.startScreen.y,
          });
          break;
        case "room": {
          // 첫 꼭짓점이 그리드에 맞도록 이동량을 맞춘다
          const anchor = drag.base[0];
          const delta = {
            x: snapValue(anchor.x + world.x - drag.start.x, step) - anchor.x,
            y: snapValue(anchor.y + world.y - drag.start.y, step) - anchor.y,
          };
          s.moveRoom(drag.roomId, drag.base, delta, drag.items);
          break;
        }
        case "opening": {
          const room = findRoom(s.doc, drag.roomId);
          const o = s.doc.floorplan.openings.find((x) => x.id === drag.openingId);
          if (!room || !o) break;
          const offset = offsetForCenter(room.points, o.edgeIndex, o.width, world);
          s.updateOpening(o.id, { offset: evt.altKey ? offset : snapValue(offset, 10) });
          break;
        }
        case "item": {
          const item = findItem(s.doc, drag.itemId);
          if (!item) break;
          const target = { x: world.x + drag.grab.x, y: world.y + drag.grab.y };
          if (evt.altKey) {
            s.updateFurniture(item.id, target);
            setGuides(null);
          } else {
            const r = snapItemPosition(
              item,
              target,
              drag.lines,
              SNAP_PX / s.viewport.scale,
              ITEM_GRID,
            );
            s.updateFurniture(item.id, r.position);
            setGuides(r.guides);
          }
          break;
        }
        case "rotate": {
          const v = sub(world, drag.center);
          // 회전 손잡이는 가구 뒤쪽(-y)에 있으므로 +90°
          const deg = normalizeAngle((Math.atan2(v.y, v.x) * 180) / Math.PI + 90);
          s.updateFurniture(drag.itemId, {
            rotation: evt.shiftKey ? Math.round(deg) : snapAngle(deg, 15),
          });
          break;
        }
        case "vertex":
          s.setRoomPoints(
            drag.roomId,
            moveVertex(drag.base, drag.index, snapPoint(world, step), !evt.shiftKey),
          );
          break;
        case "edge": {
          const d = snapValue(dot(sub(world, drag.start), drag.normal), step);
          s.setRoomPoints(drag.roomId, moveEdge(drag.base, drag.edgeIndex, d));
          break;
        }
        case "rect":
          setRectPreview({ a: drag.start, b: snapPoint(world, step) });
          break;
      }
    };

    const onUp = () => {
      const drag = dragRef.current;
      if (!drag) return;
      dragRef.current = null;
      const s = useEditorStore.getState();
      setGuides(null);

      if (drag.kind === "pan") {
        setPanning(false);
        return;
      }
      if (drag.kind === "rect") {
        setRectPreview((preview) => {
          if (preview) {
            const w = Math.abs(preview.b.x - preview.a.x);
            const h = Math.abs(preview.b.y - preview.a.y);
            if (w >= MIN_RECT_SIZE && h >= MIN_RECT_SIZE) {
              const x = Math.min(preview.a.x, preview.b.x);
              const y = Math.min(preview.a.y, preview.b.y);
              // setState 업데이트 함수 안에서 스토어를 바꾸지 않도록 다음 틱으로 미룬다
              queueMicrotask(() => {
                const st = useEditorStore.getState();
                st.addRoom(`방 ${st.doc.floorplan.rooms.length + 1}`, rectPoints(x, y, w, h));
                st.setTool("select");
              });
            }
          }
          return null;
        });
        return;
      }
      if (drag.kind === "vertex" || drag.kind === "edge") {
        const room = findRoom(s.doc, drag.roomId);
        if (room) {
          const cleaned = removeDuplicatePoints(room.points);
          if (cleaned.length !== room.points.length) s.setRoomPoints(room.id, cleaned);
          if (room.points.length !== drag.base.length) {
            s.select({ kind: "room", roomId: room.id });
          }
        }
      }
      s.endTransaction();
    };

    const onKeyDown = (evt: KeyboardEvent) => {
      if (evt.code === "Space" && !(evt.target instanceof HTMLInputElement)) {
        spaceRef.current = true;
      }
      if (evt.key === "Escape" && dragRef.current) {
        const kind = dragRef.current.kind;
        dragRef.current = null;
        setGuides(null);
        if (kind === "rect") setRectPreview(null);
        else if (kind === "pan") setPanning(false);
        else useEditorStore.getState().cancelTransaction();
      }
    };
    const onKeyUp = (evt: KeyboardEvent) => {
      if (evt.code === "Space") spaceRef.current = false;
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  const pointerWorld = (e: KonvaEventObject<PointerEvent | MouseEvent>): Vec2 => {
    const p = e.target.getStage()!.getPointerPosition()!;
    return toWorld(p, useEditorStore.getState().viewport);
  };

  const canEditShapes = (e: KonvaEventObject<PointerEvent>) =>
    tool === "select" && e.evt.button === 0 && !spaceRef.current;

  const startPan = (e: KonvaEventObject<PointerEvent>) => {
    const p = e.target.getStage()!.getPointerPosition()!;
    dragRef.current = {
      kind: "pan",
      startScreen: p,
      startViewport: useEditorStore.getState().viewport,
    };
    setPanning(true);
  };

  const onStagePointerDown = (e: KonvaEventObject<PointerEvent>) => {
    const s = useEditorStore.getState();
    if (e.evt.button === 1 || spaceRef.current) {
      startPan(e);
    } else if (e.evt.button === 0 && s.tool === "rect" && s.mode === "structure") {
      const start = snapPoint(pointerWorld(e), SNAP_STEP);
      dragRef.current = { kind: "rect", start };
      setRectPreview({ a: start, b: start });
    } else if (e.evt.button === 0) {
      s.select(null);
      startPan(e);
    }
  };

  const onWheel = (e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const s = useEditorStore.getState();
    const vp = s.viewport;
    const { deltaX, deltaY, ctrlKey, metaKey } = e.evt;
    // 트랙패드 두 손가락 스크롤은 이동, 핀치(ctrl)·마우스 휠은 확대/축소
    if (!ctrlKey && !metaKey && Math.abs(deltaX) > 0.5) {
      s.setViewport({ ...vp, x: vp.x - deltaX, y: vp.y - deltaY });
      return;
    }
    const p = e.target.getStage()!.getPointerPosition()!;
    const factor = Math.exp(-deltaY * (ctrlKey ? 0.01 : 0.0015));
    const scale = clampScale(vp.scale * factor);
    const w = toWorld(p, vp);
    s.setViewport({ scale, x: p.x - w.x * scale, y: p.y - w.y * scale });
  };

  const onRoomPointerDown = (room: Room) => (e: KonvaEventObject<PointerEvent>) => {
    if (!canEditShapes(e)) return;
    e.cancelBubble = true;
    const s = useEditorStore.getState();
    s.select({ kind: "room", roomId: room.id });
    s.beginTransaction();
    // 방 안에 있는 가구도 함께 옮긴다
    const inside = activeLayout(s.doc)
      .items.filter((i) => pointInPolygon(i, room.points))
      .map((i) => ({ id: i.id, x: i.x, y: i.y }));
    dragRef.current = {
      kind: "room",
      roomId: room.id,
      base: room.points,
      start: pointerWorld(e),
      items: inside,
    };
  };

  const onOpeningPointerDown =
    (roomId: string, openingId: string) => (e: KonvaEventObject<PointerEvent>) => {
      if (!canEditShapes(e)) return;
      e.cancelBubble = true;
      const s = useEditorStore.getState();
      s.select({ kind: "opening", roomId, openingId });
      s.beginTransaction();
      dragRef.current = { kind: "opening", openingId, roomId };
    };

  const onItemPointerDown = (itemId: string) => (e: KonvaEventObject<PointerEvent>) => {
    if (!canEditShapes(e)) return;
    e.cancelBubble = true;
    const s = useEditorStore.getState();
    const item = findItem(s.doc, itemId);
    if (!item) return;
    s.select({ kind: "furniture", itemId });
    s.beginTransaction();
    const w = pointerWorld(e);
    const others = activeLayout(s.doc).items.filter((i) => i.id !== itemId);
    dragRef.current = {
      kind: "item",
      itemId,
      grab: { x: item.x - w.x, y: item.y - w.y },
      lines: collectSnapLines(s.doc.floorplan.rooms, others),
    };
  };

  const onRotatePointerDown = (itemId: string) => (e: KonvaEventObject<PointerEvent>) => {
    if (!canEditShapes(e)) return;
    e.cancelBubble = true;
    const s = useEditorStore.getState();
    const item = findItem(s.doc, itemId);
    if (!item) return;
    s.beginTransaction();
    dragRef.current = { kind: "rotate", itemId, center: { x: item.x, y: item.y } };
  };

  // 카탈로그에서 끌어다 놓기
  const onDragOver = (e: DragEvent) => {
    if (e.dataTransfer.types.includes(FURNITURE_DRAG_TYPE)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    }
  };
  const onDrop = (e: DragEvent) => {
    const catalogId = e.dataTransfer.getData(FURNITURE_DRAG_TYPE);
    if (!catalogId) return;
    e.preventDefault();
    const r = containerRef.current!.getBoundingClientRect();
    const s = useEditorStore.getState();
    const w = toWorld({ x: e.clientX - r.left, y: e.clientY - r.top }, s.viewport);
    s.addFurniture(catalogId, { x: snapValue(w.x, ITEM_GRID), y: snapValue(w.y, ITEM_GRID) });
  };

  const onVertexPointerDown =
    (room: Room, index: number) => (e: KonvaEventObject<PointerEvent>) => {
      if (!canEditShapes(e)) return;
      e.cancelBubble = true;
      const s = useEditorStore.getState();
      s.select({ kind: "vertex", roomId: room.id, index });
      s.beginTransaction();
      dragRef.current = { kind: "vertex", roomId: room.id, index, base: room.points };
    };

  const onEdgePointerDown =
    (room: Room, edgeIndex: number) => (e: KonvaEventObject<PointerEvent>) => {
      if (!canEditShapes(e)) return;
      e.cancelBubble = true;
      const s = useEditorStore.getState();
      s.select({ kind: "edge", roomId: room.id, edgeIndex });
      s.beginTransaction();
      dragRef.current = {
        kind: "edge",
        roomId: room.id,
        edgeIndex,
        base: room.points,
        start: pointerWorld(e),
        normal: outwardNormal(room.points, edgeIndex),
      };
    };

  const onEdgeDblClick = (room: Room, edgeIndex: number) => (e: KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true;
    const [a, b] = edgeAt(room.points, edgeIndex);
    const at = closestPointOnSegment(snapPoint(pointerWorld(e), SNAP_STEP), a, b);
    if (distance(at, a) < SNAP_STEP || distance(at, b) < SNAP_STEP) return;
    const s = useEditorStore.getState();
    if (s.setRoomPoints(room.id, splitEdge(room.points, edgeIndex, at))) {
      s.select({ kind: "vertex", roomId: room.id, index: edgeIndex + 1 });
    }
  };

  const { scale } = viewport;
  const cursor = panning
    ? "grabbing"
    : tool === "rect" && structureMode
      ? "crosshair"
      : hoverCursor;

  const label = (
    key: string,
    at: Vec2,
    text: string,
    opts: { size?: number; color?: string; bold?: boolean } = {},
  ) => {
    const size = (opts.size ?? 12) / scale;
    const width = 400 / scale;
    return (
      <Text
        key={key}
        x={at.x - width / 2}
        y={at.y - size / 2}
        width={width}
        align="center"
        text={text}
        fontSize={size}
        fontStyle={opts.bold ? "bold" : "normal"}
        fontFamily="ui-sans-serif, system-ui, 'Apple SD Gothic Neo', sans-serif"
        fill={opts.color ?? COLORS.label}
        listening={false}
      />
    );
  };

  const isEdgeHighlighted = (roomId: string, i: number) =>
    (hoveredEdge?.roomId === roomId && hoveredEdge.edgeIndex === i) ||
    (selection?.kind === "edge" && selection.roomId === roomId && selection.edgeIndex === i);

  return (
    <div
      ref={containerRef}
      data-floorplan-canvas
      role="application"
      aria-label="평면도 편집 화면. 방·가구는 오른쪽 목록에서도 고를 수 있고, 방향키로 옮길 수 있어요."
      className="relative h-full w-full overflow-hidden select-none"
      style={{ cursor, background: COLORS.background }}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {size.width > 0 && (
        <Stage
          width={size.width}
          height={size.height}
          onPointerDown={onStagePointerDown}
          onWheel={onWheel}
          onContextMenu={(e: KonvaEventObject<MouseEvent>) => e.evt.preventDefault()}
        >
          <Layer listening={false}>
            <Grid width={size.width} height={size.height} viewport={viewport} />
          </Layer>
          <Layer>
            <Group x={viewport.x} y={viewport.y} scaleX={scale} scaleY={scale}>
              {/* 벽: 방 안쪽 면에서 바깥으로 두께만큼 */}
              {rooms.map((room) => (
                <Line
                  key={`wall-${room.id}`}
                  points={flat(offsetPolygon(room.points, wallThickness))}
                  closed
                  fill={COLORS.wall}
                  listening={structureMode}
                  onPointerDown={onRoomPointerDown(room)}
                  onMouseEnter={() => setHoverCursor("move")}
                  onMouseLeave={() => setHoverCursor("default")}
                />
              ))}
              {/* 바닥 */}
              {rooms.map((room) => {
                const selected = room.id === selectedRoom?.id;
                return (
                  <Line
                    key={`floor-${room.id}`}
                    points={flat(room.points)}
                    closed
                    fill={room.floorColor}
                    stroke={selected ? COLORS.accent : undefined}
                    strokeWidth={selected ? 2 : 0}
                    strokeScaleEnabled={false}
                    listening={structureMode}
                    onPointerDown={onRoomPointerDown(room)}
                    onMouseEnter={() => setHoverCursor("move")}
                    onMouseLeave={() => setHoverCursor("default")}
                  />
                );
              })}
              {/* 이름·면적·벽 길이 */}
              {rooms.map((room) => {
                const c = centroid(room.points);
                return (
                  <Group key={`labels-${room.id}`} listening={false}>
                    {label(`name`, { x: c.x, y: c.y - 9 / scale }, room.name, {
                      size: 13,
                      bold: true,
                      color: COLORS.labelStrong,
                    })}
                    {label(
                      `area`,
                      { x: c.x, y: c.y + 9 / scale },
                      formatArea(polygonArea(room.points)),
                      { size: 11 },
                    )}
                    {room.points.map((_, i) => {
                      const [a, b] = edgeAt(room.points, i);
                      const n = outwardNormal(room.points, i);
                      // 안쪽 치수이므로 방 안쪽에 표시 (이웃 방 라벨과 겹치지 않게)
                      const off = -(12 + 16 * Math.abs(n.x)) / scale;
                      const mid = {
                        x: (a.x + b.x) / 2 + n.x * off,
                        y: (a.y + b.y) / 2 + n.y * off,
                      };
                      return label(`edge-${i}`, mid, formatLength(distance(a, b), displayUnit), {
                        size: 11,
                        color: isEdgeHighlighted(room.id, i) ? COLORS.accent : COLORS.label,
                        bold: isEdgeHighlighted(room.id, i),
                      });
                    })}
                  </Group>
                );
              })}
              {/* 문·창문 */}
              {openings.map((o) => {
                const room = rooms.find((r) => r.id === o.roomId);
                if (!room) return null;
                return (
                  <OpeningShape
                    key={o.id}
                    points={room.points}
                    opening={o}
                    wallThickness={wallThickness}
                    floorColor={room.floorColor}
                    selected={selection?.kind === "opening" && selection.openingId === o.id}
                    interactive={structureMode}
                    scale={scale}
                    onPointerDown={onOpeningPointerDown(room.id, o.id)}
                    onHover={(h) => setHoverCursor(h ? "pointer" : "default")}
                  />
                );
              })}
              {/* 가구 */}
              {items.map((item) => (
                <FurnitureShape
                  key={item.id}
                  item={item}
                  selected={item.id === selectedItemId}
                  interactive={!structureMode}
                  dimmed={structureMode}
                  scale={scale}
                  onPointerDown={onItemPointerDown(item.id)}
                  onRotateStart={onRotatePointerDown(item.id)}
                  onHover={(c) => setHoverCursor(c ?? "default")}
                />
              ))}
              {!structureMode &&
                items.map((item) => {
                  const selected = item.id === selectedItemId;
                  if (!selected && Math.min(item.width, item.depth) * scale < 36) return null;
                  const at = itemLabelPoint(item, symbolOf(item.catalogId) === "l-shape");
                  return (
                    <Group key={`item-label-${item.id}`} listening={false}>
                      {label("n", { x: at.x, y: at.y - (selected ? 7 : 0) / scale }, item.name, {
                        size: 11,
                        bold: selected,
                        color: COLORS.labelStrong,
                      })}
                      {selected &&
                        label(
                          "d",
                          { x: at.x, y: at.y + 8 / scale },
                          `${formatLength(item.width, displayUnit)} × ${formatLength(item.depth, displayUnit)}`,
                          { size: 10 },
                        )}
                    </Group>
                  );
                })}
              {/* 충돌·동선 경고 */}
              {showWarnings && (
                <WarningOverlay
                  warnings={warnings}
                  items={items}
                  focusedId={focusedWarningId}
                  scale={scale}
                />
              )}
              {/* 스냅 안내선 */}
              {guides?.x !== undefined && (
                <Line
                  points={[guides.x, -1e6, guides.x, 1e6]}
                  stroke={COLORS.guide}
                  strokeWidth={1 / scale}
                  dash={[4 / scale, 4 / scale]}
                  listening={false}
                />
              )}
              {guides?.y !== undefined && (
                <Line
                  points={[-1e6, guides.y, 1e6, guides.y]}
                  stroke={COLORS.guide}
                  strokeWidth={1 / scale}
                  dash={[4 / scale, 4 / scale]}
                  listening={false}
                />
              )}
              {/* 선택된 방: 벽 드래그 핸들, 꼭짓점 핸들 */}
              {selectedRoom && (
                <Group>
                  {selectedRoom.points.map((_, i) => {
                    const [a, b] = edgeAt(selectedRoom.points, i);
                    const hl = isEdgeHighlighted(selectedRoom.id, i);
                    return (
                      <Line
                        key={`edge-${i}`}
                        points={flat([a, b])}
                        stroke={hl ? COLORS.accent : "rgba(0,0,0,0)"}
                        strokeWidth={4 / scale}
                        hitStrokeWidth={16 / scale}
                        onPointerDown={onEdgePointerDown(selectedRoom, i)}
                        onDblClick={onEdgeDblClick(selectedRoom, i)}
                        onMouseEnter={() => {
                          setHoverCursor(edgeCursor(a, b));
                          useEditorStore
                            .getState()
                            .setHoveredEdge({ roomId: selectedRoom.id, edgeIndex: i });
                        }}
                        onMouseLeave={() => {
                          setHoverCursor("default");
                          useEditorStore.getState().setHoveredEdge(null);
                        }}
                      />
                    );
                  })}
                  {selectedRoom.points.map((p, i) => {
                    const active =
                      selection?.kind === "vertex" &&
                      selection.roomId === selectedRoom.id &&
                      selection.index === i;
                    return (
                      <Circle
                        key={`v-${i}`}
                        x={p.x}
                        y={p.y}
                        radius={(active ? 6 : 5) / scale}
                        fill={active ? COLORS.accent : "#ffffff"}
                        stroke={COLORS.accent}
                        strokeWidth={1.5}
                        strokeScaleEnabled={false}
                        hitStrokeWidth={10 / scale}
                        onPointerDown={onVertexPointerDown(selectedRoom, i)}
                        onMouseEnter={() => setHoverCursor("pointer")}
                        onMouseLeave={() => setHoverCursor("default")}
                      />
                    );
                  })}
                </Group>
              )}
              {/* 사각형 그리기 미리보기 */}
              {rectPreview && (
                <Group listening={false}>
                  <Rect
                    x={Math.min(rectPreview.a.x, rectPreview.b.x)}
                    y={Math.min(rectPreview.a.y, rectPreview.b.y)}
                    width={Math.abs(rectPreview.b.x - rectPreview.a.x)}
                    height={Math.abs(rectPreview.b.y - rectPreview.a.y)}
                    fill={COLORS.accentSoft}
                    stroke={COLORS.accent}
                    strokeWidth={1.5}
                    strokeScaleEnabled={false}
                    dash={[6 / scale, 4 / scale]}
                  />
                  {label(
                    "rect-size",
                    {
                      x: (rectPreview.a.x + rectPreview.b.x) / 2,
                      y: (rectPreview.a.y + rectPreview.b.y) / 2,
                    },
                    `${formatLength(Math.abs(rectPreview.b.x - rectPreview.a.x), displayUnit)} × ${formatLength(Math.abs(rectPreview.b.y - rectPreview.a.y), displayUnit)}`,
                    { size: 13, bold: true, color: COLORS.accent },
                  )}
                </Group>
              )}
            </Group>
          </Layer>
        </Stage>
      )}

      <ScaleBar scale={scale} />

      {rooms.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <p className="rounded-lg bg-white/90 px-4 py-3 text-sm text-neutral-600 shadow-sm ring-1 ring-neutral-200">
            왼쪽에서 프리셋을 고르거나, <kbd className="font-semibold">R</kbd>을 누르고 끌어서 방을
            그려 보세요.
          </p>
        </div>
      )}
    </div>
  );
}

/** 왼쪽 아래 축척 막대 */
function ScaleBar({ scale }: { scale: number }) {
  const candidates = [100, 200, 500, 1000, 2000, 5000, 10000];
  const mm = candidates.find((c) => c * scale >= 60) ?? candidates[candidates.length - 1];
  return (
    <div className="pointer-events-none absolute bottom-3 left-3 flex flex-col gap-1 text-[11px] text-neutral-500">
      <div className="h-1.5 border-x border-b border-neutral-500" style={{ width: mm * scale }} />
      <span>{formatLength(mm, mm >= 1000 ? "m" : "cm")}</span>
    </div>
  );
}
