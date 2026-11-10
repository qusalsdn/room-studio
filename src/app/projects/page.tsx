import type { Metadata } from "next";
import { ProjectsClient } from "./ProjectsClient";

export const metadata: Metadata = { title: "내 프로젝트 · Room Studio" };

export default function ProjectsPage() {
  return <ProjectsClient />;
}
