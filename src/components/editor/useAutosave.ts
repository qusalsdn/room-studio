"use client";

import { useEffect } from "react";
import { saveProject } from "@/lib/projects";
import { useEditorStore } from "@/store/editorStore";

const DEBOUNCE_MS = 1200;
const RETRY_MS = 5000;

/**
 * 클라우드 프로젝트 자동 저장.
 * 편집이 멈추고 1.2초 뒤 저장하고, 드래그 중에는 기다렸다가 끝난 뒤 저장한다.
 */
export function useAutosave(projectId: string) {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let saving = false;
    let lastSaved = useEditorStore.getState().doc;

    const schedule = (ms = DEBOUNCE_MS) => {
      clearTimeout(timer);
      timer = setTimeout(flush, ms);
    };

    const flush = async () => {
      const s = useEditorStore.getState();
      if (s.projectId !== projectId) return;
      if (s.txBase) return schedule(); // 드래그 중
      const doc = s.doc;
      if (doc === lastSaved || saving) return;
      saving = true;
      s.setSaveStatus("saving");
      try {
        await saveProject(projectId, doc);
        lastSaved = doc;
        const now = useEditorStore.getState();
        now.setSaveStatus(now.doc === doc ? "saved" : "dirty");
      } catch {
        useEditorStore.getState().setSaveStatus("error");
        schedule(RETRY_MS);
      } finally {
        saving = false;
        if (useEditorStore.getState().doc !== lastSaved) schedule();
      }
    };

    const unsubscribe = useEditorStore.subscribe((state, prev) => {
      if (state.projectId !== projectId || state.doc === prev.doc) return;
      if (state.saveStatus !== "saving" && state.saveStatus !== "dirty") {
        state.setSaveStatus("dirty");
      }
      schedule();
    });

    // 탭을 닫거나 다른 앱으로 갈 때는 바로 저장
    const onHide = () => {
      if (document.visibilityState === "hidden") void flush();
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (useEditorStore.getState().doc !== lastSaved) e.preventDefault();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      unsubscribe();
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("beforeunload", onBeforeUnload);
      void flush(); // 다른 화면으로 나갈 때 남은 변경 저장
    };
  }, [projectId]);
}
