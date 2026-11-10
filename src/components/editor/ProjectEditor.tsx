"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { getProject } from "@/lib/projects";
import { useEditorStore } from "@/store/editorStore";
import { Editor } from "./Editor";
import { useAutosave } from "./useAutosave";

type LoadState = { status: "loading" } | { status: "ready" } | { status: "error"; message: string };

function Message({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-4 text-sm text-neutral-600">
      {children}
    </div>
  );
}

function LoadedEditor({ projectId }: { projectId: string }) {
  useAutosave(projectId);
  return <Editor />;
}

/** 계정에 저장된 프로젝트 편집기 (/p/[id]) */
export function ProjectEditor() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, ready } = useAuth();
  const [load, setLoad] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    if (ready && !user) router.replace(`/login`);
  }, [ready, user, router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getProject(id)
      .then((project) => {
        if (cancelled) return;
        if (!project) {
          setLoad({
            status: "error",
            message: "프로젝트를 찾을 수 없어요. 지워졌거나 내 것이 아니에요.",
          });
          return;
        }
        useEditorStore.getState().loadProject(project.id, project.document);
        setLoad({ status: "ready" });
      })
      .catch((e: Error) => {
        if (!cancelled) setLoad({ status: "error", message: e.message });
      });
    return () => {
      cancelled = true;
    };
  }, [id, user]);

  if (load.status === "error") {
    return (
      <Message>
        <p>{load.message}</p>
        <Link href="/projects" className="font-medium text-blue-600 hover:underline">
          내 프로젝트로 돌아가기
        </Link>
      </Message>
    );
  }
  if (load.status === "loading") return <Message>프로젝트를 불러오는 중…</Message>;
  return <LoadedEditor projectId={id} />;
}
