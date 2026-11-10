"use client";

import dynamic from "next/dynamic";

// 로그인 상태와 브라우저 저장본을 읽으므로 클라이언트에서만 그린다
export const ProjectsClient = dynamic(() => import("./ProjectList").then((m) => m.ProjectList), {
  ssr: false,
  loading: () => <p className="p-10 text-sm text-neutral-500">불러오는 중…</p>,
});
