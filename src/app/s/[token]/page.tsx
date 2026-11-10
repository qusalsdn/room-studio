import type { Metadata } from "next";
import { notFound } from "next/navigation";
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

// 공유 데이터를 먼저 읽고 응답해야 없는·끊긴 링크에 404 상태를 돌려줄 수 있다.
// (Suspense로 먼저 흘려보내면 상태 코드가 200으로 고정된다)
export const instant = false;

export default async function SharedPage({ params }: PageProps<"/s/[token]">) {
  const { token } = await params;
  const project = await getSharedProject(token);
  if (!project) notFound();
  return <SharedViewerClient project={project} token={token} />;
}
