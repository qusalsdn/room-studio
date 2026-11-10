import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SharedViewerClient } from "@/components/shared/SharedViewerClient";
import { getSharedProject } from "@/lib/sharedProject";
import { currentLayout } from "@/store/editorStore";

export async function generateMetadata({ params }: PageProps<"/s/[token]">): Promise<Metadata> {
  const { token } = await params;
  const project = await getSharedProject(token);
  if (!project) {
    return { title: "공유 링크를 찾을 수 없어요 · Room Studio", robots: { index: false } };
  }
  const rooms = project.document.floorplan.rooms.length;
  const items = currentLayout(project.document).items.length;
  return {
    title: `${project.name} · Room Studio`,
    description: `방 ${rooms}개, 가구 ${items}개의 배치를 평면도와 3D로 볼 수 있어요.`,
    // 개인 집 구조이므로 검색에 노출하지 않는다
    robots: { index: false, follow: false },
  };
}

async function Shared({ params }: { params: PageProps<"/s/[token]">["params"] }) {
  const { token } = await params;
  const project = await getSharedProject(token);
  if (!project) notFound();
  return <SharedViewerClient project={project} token={token} />;
}

export default function SharedPage({ params }: PageProps<"/s/[token]">) {
  return (
    <Suspense
      fallback={
        <div className="flex h-dvh items-center justify-center text-sm text-neutral-500">
          불러오는 중…
        </div>
      }
    >
      <Shared params={params} />
    </Suspense>
  );
}
