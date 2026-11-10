"use client";

import { useEffect, useState } from "react";
import { useEditorStore } from "@/store/editorStore";
import { Editor } from "./Editor";

/** 로그인 없이 쓰는 편집기. 문서는 이 브라우저에만 저장된다 */
export function GuestEditor() {
  // 클라우드 프로젝트를 보다가 넘어왔으면 게스트 문서로 바꾼 뒤에 그린다
  const [ready, setReady] = useState(() => useEditorStore.getState().projectId === null);
  useEffect(() => {
    if (!ready) {
      useEditorStore.getState().openGuest();
      queueMicrotask(() => setReady(true));
    }
  }, [ready]);
  return ready ? <Editor /> : null;
}
