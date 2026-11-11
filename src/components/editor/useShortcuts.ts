"use client";

import { useEffect } from "react";
import { pointInPolygon } from "@/geometry/polygon";
import { removeVertex } from "@/geometry/roomEdit";
import {
  activeLayout,
  activeSuggestion,
  findItem,
  findRoom,
  useEditorStore,
} from "@/store/editorStore";

function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

const ARROWS: Record<string, { x: number; y: number }> = {
  arrowleft: { x: -1, y: 0 },
  arrowright: { x: 1, y: 0 },
  arrowup: { x: 0, y: -1 },
  arrowdown: { x: 0, y: 1 },
};

export function useShortcuts() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      const s = useEditorStore.getState();
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();
      const sel = s.selection;

      if (mod && key === "z") {
        e.preventDefault();
        if (e.shiftKey) s.redo();
        else s.undo();
        return;
      }
      if (mod && key === "y") {
        e.preventDefault();
        s.redo();
        return;
      }
      if (mod && key === "d") {
        e.preventDefault();
        if (sel?.kind === "furniture") s.duplicateFurniture(sel.itemId);
        return;
      }
      if (e.key === "?") {
        e.preventDefault();
        s.setHelp(s.help === "shortcuts" ? null : "shortcuts");
        return;
      }
      if (mod || e.altKey || s.help) return;

      if (key === "1") s.setMode("structure");
      else if (key === "2") s.setMode("furniture");
      else if (key === "f") s.requestFit();
      else if (key === "v") s.setTool("select");
      else if (key === "r") {
        if (s.mode === "structure") s.setTool("rect");
        else if (sel?.kind === "furniture") {
          const item = findItem(s.doc, sel.itemId);
          if (item)
            s.updateFurniture(item.id, { rotation: item.rotation + (e.shiftKey ? -90 : 90) });
        }
      } else if (key === "escape") {
        if (activeSuggestion(s)) s.clearSuggestion();
        else if (s.tool !== "select") s.setTool("select");
        else s.select(null);
      } else if ((key === "delete" || key === "backspace") && sel) {
        e.preventDefault();
        if (sel.kind === "furniture") s.deleteFurniture(sel.itemId);
        else if (sel.kind === "opening") s.deleteOpening(sel.openingId);
        else if (sel.kind === "room") s.deleteRoom(sel.roomId);
        else if (sel.kind === "vertex") {
          const room = findRoom(s.doc, sel.roomId);
          if (room && s.setRoomPoints(room.id, removeVertex(room.points, sel.index))) {
            s.select({ kind: "room", roomId: room.id });
          }
        }
      } else if (ARROWS[key] && sel) {
        e.preventDefault();
        const step = e.shiftKey ? 100 : 10;
        const dir = ARROWS[key];
        const delta = { x: dir.x * step, y: dir.y * step };
        if (sel.kind === "furniture") {
          const item = findItem(s.doc, sel.itemId);
          if (item) s.updateFurniture(item.id, { x: item.x + delta.x, y: item.y + delta.y });
        } else if (sel.kind === "opening") {
          const o = s.doc.floorplan.openings.find((x) => x.id === sel.openingId);
          if (o) s.updateOpening(o.id, { offset: o.offset + (dir.x + dir.y) * step });
        } else {
          const room = findRoom(s.doc, sel.roomId);
          if (!room) return;
          const inside = activeLayout(s.doc)
            .items.filter((i) => pointInPolygon(i, room.points))
            .map((i) => ({ id: i.id, x: i.x, y: i.y }));
          s.moveRoom(room.id, room.points, delta, inside);
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
