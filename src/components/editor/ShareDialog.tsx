"use client";

import { useEffect, useState } from "react";
import { createShare, getActiveShare, revokeShare, shareUrl } from "@/lib/shares";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { useEditorStore } from "@/store/editorStore";
import { Button } from "./fields";

type State =
  | { status: "loading" }
  | { status: "none" }
  | { status: "shared"; token: string }
  | { status: "error"; message: string };

/** 툴바 "공유" 버튼과 대화상자 */
export function ShareButton() {
  const projectId = useEditorStore((s) => s.projectId);
  const [open, setOpen] = useState(false);
  const cloud = isSupabaseConfigured && projectId && !projectId.startsWith("shared:");

  return (
    <>
      <Button
        variant="ghost"
        disabled={!cloud}
        onClick={() => setOpen(true)}
        title={cloud ? "읽기 전용 링크로 공유" : "로그인해서 저장한 프로젝트만 공유할 수 있어요"}
      >
        공유
      </Button>
      {open && cloud && <ShareDialog projectId={projectId} onClose={() => setOpen(false)} />}
    </>
  );
}

function ShareDialog({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getActiveShare(projectId)
      .then((token) => {
        if (!cancelled) setState(token ? { status: "shared", token } : { status: "none" });
      })
      .catch((e: Error) => !cancelled && setState({ status: "error", message: e.message }));
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const run = async (fn: () => Promise<State>) => {
    setBusy(true);
    try {
      setState(await fn());
    } catch (e) {
      setState({ status: "error", message: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const copy = async (url: string) => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/20 pt-24"
      onPointerDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-title"
        className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl ring-1 ring-neutral-200"
      >
        <h2 id="share-title" className="text-base font-semibold">
          공유 링크
        </h2>
        <p className="mt-1 text-sm text-neutral-600">
          링크가 있는 사람은 로그인 없이 평면도와 3D를 볼 수 있어요. 편집은 할 수 없고, 바꾼 내용은
          저장되는 대로 링크에도 보여요.
        </p>

        <div className="mt-4">
          {state.status === "loading" && <p className="text-sm text-neutral-500">확인하는 중…</p>}
          {state.status === "error" && (
            <p role="alert" className="text-sm text-red-600">
              문제가 생겼어요: {state.message}
            </p>
          )}
          {state.status === "none" && (
            <Button
              variant="primary"
              disabled={busy}
              onClick={() =>
                run(async () => ({ status: "shared", token: await createShare(projectId) }))
              }
            >
              링크 만들기
            </Button>
          )}
          {state.status === "shared" && (
            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                <input
                  readOnly
                  value={shareUrl(state.token)}
                  aria-label="공유 링크"
                  onFocus={(e) => e.currentTarget.select()}
                  className="min-w-0 flex-1 rounded-md border border-neutral-300 bg-neutral-50 px-2 py-1.5 text-sm"
                />
                <Button variant="primary" onClick={() => copy(shareUrl(state.token))}>
                  {copied ? "복사됨" : "복사"}
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <a
                  href={shareUrl(state.token)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  새 탭에서 열어 보기
                </a>
                <Button
                  variant="danger"
                  disabled={busy}
                  onClick={() => {
                    if (!window.confirm("링크를 끊을까요? 이 링크로는 더 이상 볼 수 없어요."))
                      return;
                    run(async () => {
                      await revokeShare(state.token);
                      return { status: "none" };
                    });
                  }}
                >
                  링크 끊기
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-5 flex justify-end">
          <Button variant="ghost" autoFocus onClick={onClose}>
            닫기
          </Button>
        </div>
      </div>
    </div>
  );
}
