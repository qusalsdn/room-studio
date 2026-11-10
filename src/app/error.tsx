"use client";

import Link from "next/link";

/** 화면을 그리다 예상치 못한 오류가 났을 때 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 bg-white px-6 py-24 text-center">
      <h1 className="text-lg font-semibold">문제가 생겼어요</h1>
      <p className="max-w-md text-sm text-neutral-600">
        잠시 후 다시 시도해 주세요. 편집하던 내용은 마지막으로 저장된 상태로 남아 있어요.
      </p>
      {error.digest && <p className="text-xs text-neutral-500">오류 코드: {error.digest}</p>}
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
        >
          다시 시도
        </button>
        <Link
          href="/"
          className="rounded-lg px-4 py-2 text-sm font-medium text-neutral-700 ring-1 ring-neutral-300 hover:bg-neutral-50"
        >
          처음으로
        </Link>
      </div>
    </main>
  );
}
