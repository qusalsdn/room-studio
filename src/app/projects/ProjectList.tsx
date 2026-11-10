"use client";

import Link, { useLinkStatus } from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { createEmptyDocument, type HouseDocument } from "@/domain/document";
import { bounds, polygonArea } from "@/geometry/polygon";
import { displayName, signOut, useAuth } from "@/lib/auth";
import { formatArea } from "@/lib/format";
import { createProject, deleteProject, listProjects, type ProjectSummary } from "@/lib/projects";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { clearGuestDocument, currentLayout, readGuestDocument } from "@/store/editorStore";

const relative = new Intl.RelativeTimeFormat("ko", { numeric: "auto" });

function timeAgo(iso: string): string {
  const diff = (new Date(iso).getTime() - Date.now()) / 1000;
  const steps: [number, Intl.RelativeTimeFormatUnit][] = [
    [60, "second"],
    [60, "minute"],
    [24, "hour"],
    [7, "day"],
    [4.35, "week"],
    [12, "month"],
    [Infinity, "year"],
  ];
  let value = diff;
  for (const [size, unit] of steps) {
    if (Math.abs(value) < size) return relative.format(Math.round(value), unit);
    value /= size;
  }
  return "";
}

/** 방 모양 미리보기 */
function Thumbnail({ doc }: { doc: HouseDocument | null }) {
  const rooms = doc?.floorplan.rooms ?? [];
  if (rooms.length === 0) {
    return (
      <div className="flex h-36 items-center justify-center bg-stone-50 text-xs text-neutral-500">
        아직 방이 없어요
      </div>
    );
  }
  const b = bounds(rooms.flatMap((r) => r.points));
  const pad = Math.max(b.maxX - b.minX, b.maxY - b.minY) * 0.08;
  const t = doc!.settings.wallThickness;
  return (
    <svg
      viewBox={`${b.minX - pad} ${b.minY - pad} ${b.maxX - b.minX + pad * 2} ${b.maxY - b.minY + pad * 2}`}
      className="h-36 w-full bg-stone-50"
      aria-hidden
    >
      {rooms.map((r) => (
        <polygon
          key={r.id}
          points={r.points.map((p) => `${p.x},${p.y}`).join(" ")}
          fill={r.floorColor}
          stroke="#3f3f46"
          strokeWidth={t}
        />
      ))}
      {currentLayout(doc!).items.map((i) => (
        <rect
          key={i.id}
          x={i.x - i.width / 2}
          y={i.y - i.depth / 2}
          width={i.width}
          height={i.depth}
          fill={i.color}
          transform={`rotate(${i.rotation} ${i.x} ${i.y})`}
        />
      ))}
    </svg>
  );
}

export function ProjectList() {
  const router = useRouter();
  const { user, ready } = useAuth();
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // 개발 서버에서는 편집기 화면을 처음 열 때 컴파일로 몇 초 걸린다. 그동안 '여는 중'을 보여 준다
  const [navigating, startNavigation] = useTransition();
  const working = busy || navigating;
  const [guestDoc, setGuestDoc] = useState<HouseDocument | null>(() => readGuestDocument());

  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  const refresh = useCallback(() => {
    listProjects()
      .then(setProjects)
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    if (user) refresh();
  }, [user, refresh]);

  const open = async (doc: HouseDocument) => {
    setBusy(true);
    try {
      const id = await createProject(doc);
      startNavigation(() => router.push(`/p/${id}`));
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  const importGuest = async () => {
    if (!guestDoc) return;
    setBusy(true);
    try {
      const id = await createProject(guestDoc);
      clearGuestDocument();
      setGuestDoc(null);
      startNavigation(() => router.push(`/p/${id}`));
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  const remove = async (p: ProjectSummary) => {
    if (!window.confirm(`'${p.name}'을(를) 삭제할까요? 되돌릴 수 없어요.`)) return;
    try {
      await deleteProject(p.id);
      setProjects((list) => list?.filter((x) => x.id !== p.id) ?? null);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  if (!isSupabaseConfigured) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16 text-sm text-neutral-600">
        로그인 서버가 아직 연결되지 않았어요.{" "}
        <Link href="/editor" className="font-medium text-blue-600 hover:underline">
          로그인 없이 편집하기
        </Link>
      </main>
    );
  }
  if (!user) return <p className="p-10 text-sm text-neutral-500">로그인 확인 중…</p>;

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <header className="flex flex-wrap items-center gap-3">
        <Link href="/" className="text-sm font-semibold text-neutral-500">
          Room Studio
        </Link>
        <h1 className="w-full text-2xl font-semibold tracking-tight sm:w-auto sm:flex-1">
          내 프로젝트
        </h1>
        <span className="text-sm text-neutral-500">{displayName(user)}</span>
        <button
          type="button"
          onClick={async () => {
            await signOut();
            router.replace("/");
          }}
          className="rounded-md px-2 py-1 text-sm text-neutral-600 hover:bg-neutral-100"
        >
          로그아웃
        </button>
      </header>

      {guestDoc && (
        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-900 ring-1 ring-blue-100">
          <p className="flex-1">
            로그인 전에 이 브라우저에서 만든 &lsquo;{guestDoc.name}&rsquo;(방{" "}
            {guestDoc.floorplan.rooms.length}개, 가구 {currentLayout(guestDoc).items.length}개)이
            있어요. 계정으로 옮기면 다른 기기에서도 열 수 있어요.
          </p>
          <button
            type="button"
            disabled={working}
            onClick={importGuest}
            className="rounded-lg bg-blue-600 px-3 py-1.5 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            계정으로 가져오기
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-6 text-sm text-red-600">
          문제가 생겼어요: {error}
        </p>
      )}

      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <li>
          <button
            type="button"
            disabled={working}
            onClick={() => open(createEmptyDocument(`우리 집 ${(projects?.length ?? 0) + 1}`))}
            aria-busy={working}
            className="flex h-full min-h-56 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-neutral-300 text-sm font-medium text-neutral-600 hover:border-blue-400 hover:text-blue-700 disabled:opacity-50"
          >
            {working ? (
              "여는 중…"
            ) : (
              <>
                <span className="text-2xl">＋</span>새 프로젝트
              </>
            )}
          </button>
        </li>
        {projects === null && !error && (
          <li className="flex items-center justify-center text-sm text-neutral-500">
            불러오는 중…
          </li>
        )}
        {projects?.map((p) => {
          const rooms = p.document?.floorplan.rooms ?? [];
          const area = rooms.reduce((sum, r) => sum + polygonArea(r.points), 0);
          return (
            <li
              key={p.id}
              className="group relative overflow-hidden rounded-xl bg-white ring-1 ring-neutral-200 hover:ring-blue-300"
            >
              <Link href={`/p/${p.id}`} className="block">
                <Thumbnail doc={p.document} />
                <OpeningHint />
                <div className="px-4 pt-3">
                  <p className="truncate font-medium text-neutral-900">{p.name}</p>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    방 {rooms.length}개 · {formatArea(area)} · {timeAgo(p.updatedAt)} 수정
                  </p>
                </div>
              </Link>
              <div className="flex justify-end px-2 pb-2">
                <button
                  type="button"
                  onClick={() => remove(p)}
                  className="rounded-md px-2 py-1 text-xs text-neutral-500 hover:bg-red-50 hover:text-red-600"
                >
                  삭제
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}

/** 카드를 눌렀을 때 편집기가 뜰 때까지 표시 */
function OpeningHint() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <span className="absolute inset-x-0 top-0 bg-blue-600 py-1 text-center text-xs font-medium text-white">
      여는 중…
    </span>
  );
}
