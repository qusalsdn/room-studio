"use client";

import dynamic from "next/dynamic";

const loading = () => (
  <div className="flex h-dvh items-center justify-center text-sm text-neutral-500">
    편집기를 불러오는 중…
  </div>
);

// 편집기 전체를 클라이언트에서만 렌더한다.
// 문서가 localStorage·서버에서 오므로 서버 렌더 결과와 달라지는 것을 막는다.
const GuestEditor = dynamic(() => import("./GuestEditor").then((m) => m.GuestEditor), {
  ssr: false,
  loading,
});

const ProjectEditor = dynamic(() => import("./ProjectEditor").then((m) => m.ProjectEditor), {
  ssr: false,
  loading,
});

export function EditorClient() {
  return <GuestEditor />;
}

export function ProjectEditorClient() {
  return <ProjectEditor />;
}
