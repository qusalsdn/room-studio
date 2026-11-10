"use client";

import { useEffect } from "react";
import { removeVertex, translatePoints } from "@/geometry/roomEdit";
import { findRoom, useEditorStore } from "@/store/editorStore";

function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

export function useShortcuts() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      const s = useEditorStore.getState();
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

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
      if (mod) return;

      if (key === "v") s.setTool("select");
      else if (key === "r") s.setTool("rect");
      else if (key === "f") s.requestFit();
      else if (key === "escape") {
        if (s.tool !== "select") s.setTool("select");
        else s.select(null);
      } else if ((key === "delete" || key === "backspace") && s.selection) {
        e.preventDefault();
        const sel = s.selection;
        if (sel.kind === "vertex") {
          const room = findRoom(s.doc, sel.roomId);
          if (room && s.setRoomPoints(room.id, removeVertex(room.points, sel.index))) {
            s.select({ kind: "room", roomId: room.id });
          }
        } else {
          s.deleteRoom(sel.roomId);
        }
      } else if (key.startsWith("arrow") && s.selection) {
        e.preventDefault();
        const room = findRoom(s.doc, s.selection.roomId);
        if (!room) return;
        const step = e.shiftKey ? 100 : 10;
        const delta = {
          arrowleft: { x: -step, y: 0 },
          arrowright: { x: step, y: 0 },
          arrowup: { x: 0, y: -step },
          arrowdown: { x: 0, y: step },
        }[key];
        if (delta) s.setRoomPoints(room.id, translatePoints(room.points, delta));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
