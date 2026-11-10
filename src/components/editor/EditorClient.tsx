"use client";

import dynamic from "next/dynamic";

// 편집기 전체를 클라이언트에서만 렌더한다.
// 문서가 localStorage에서 복원되므로 서버 렌더 결과와 달라지는 것을 막는다.
const Editor = dynamic(() => import("./Editor").then((m) => m.Editor), {
  ssr: false,
  loading: () => (
    <div className="flex h-dvh items-center justify-center text-sm text-neutral-500">
      편집기를 불러오는 중…
    </div>
  ),
});

export function EditorClient() {
  return <Editor />;
}
