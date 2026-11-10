import type { Metadata } from "next";
import { ProjectEditorClient } from "@/components/editor/EditorClient";

export const metadata: Metadata = { title: "편집기 · Room Studio" };

export default function ProjectPage() {
  return <ProjectEditorClient />;
}
