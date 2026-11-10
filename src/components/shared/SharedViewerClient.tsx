"use client";

import dynamic from "next/dynamic";
import type { SharedProject } from "@/lib/sharedProject";

const SharedViewer = dynamic(() => import("./SharedViewer").then((m) => m.SharedViewer), {
  ssr: false,
  loading: () => (
    <div className="flex h-dvh items-center justify-center text-sm text-neutral-500">
      불러오는 중…
    </div>
  ),
});

export function SharedViewerClient(props: { project: SharedProject; token: string }) {
  return <SharedViewer {...props} />;
}
