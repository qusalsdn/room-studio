"use client";

import Link from "next/link";
import { displayName, useAuth } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { useEditorStore, type SaveStatus } from "@/store/editorStore";

const SAVE_LABELS: Record<SaveStatus, { text: string; className: string }> = {
  saved: { text: "저장됨", className: "text-neutral-400" },
  dirty: { text: "저장 대기", className: "text-neutral-400" },
  saving: { text: "저장 중…", className: "text-neutral-500" },
  error: { text: "저장 실패 · 다시 시도 중", className: "text-red-600" },
};

/** 툴바 오른쪽: 저장 상태와 로그인 정보 */
export function AccountStatus() {
  const projectId = useEditorStore((s) => s.projectId);
  const saveStatus = useEditorStore((s) => s.saveStatus);
  const { user } = useAuth();

  const save = projectId ? SAVE_LABELS[saveStatus] : null;

  return (
    <div className="flex items-center gap-3 text-xs">
      {save ? (
        <span role="status" className={save.className}>
          {save.text}
        </span>
      ) : (
        <span className="text-neutral-400">이 브라우저에 저장됨</span>
      )}
      {isSupabaseConfigured &&
        (user ? (
          <Link
            href="/projects"
            className="rounded-md px-2 py-1 font-medium text-neutral-700 hover:bg-neutral-100"
          >
            {displayName(user)} · 내 프로젝트
          </Link>
        ) : (
          <Link
            href="/login"
            className="rounded-md bg-neutral-900 px-2.5 py-1 font-medium text-white hover:bg-neutral-800"
          >
            로그인해서 저장
          </Link>
        ))}
    </div>
  );
}
