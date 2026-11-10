import { ImageResponse } from "next/og";
import { StaticPlan } from "@/components/plan/StaticPlan";
import { getSharedProject } from "@/lib/sharedProject";
import { currentLayout } from "@/store/editorStore";

export const alt = "공유된 집 평면도";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** 링크를 메신저에 붙였을 때 보이는 미리보기: 현재 배치 평면도 (글자 없이) */
export default async function Image({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const project = await getSharedProject(token);
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#fafaf9",
      }}
    >
      {project && (
        <StaticPlan
          doc={project.document}
          items={currentLayout(project.document).items.map((item) => ({
            item,
            style: "normal" as const,
          }))}
          showLabels={false}
          width={1120}
          height={560}
        />
      )}
    </div>,
    size,
  );
}
