import type { Metadata } from "next";
import { EditorClient } from "@/components/editor/EditorClient";

export const metadata: Metadata = {
  title: "편집기 · Room Studio",
};

export default function EditorPage() {
  return <EditorClient />;
}
