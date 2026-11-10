import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-6 px-6 py-24">
      <p className="text-sm font-medium tracking-wide text-neutral-500">Room Studio</p>
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
        옮기기 전에, 먼저 배치해 보세요.
      </h1>
      <p className="text-lg text-neutral-600 dark:text-neutral-400">
        우리 집 구조와 가구를 실측 치수로 옮겨 놓고 2D 평면도와 3D로 재배치를 미리 확인하는
        서비스입니다. 지금은 개발 중이에요.
      </p>
      <div>
        <Link
          href="/editor"
          className="inline-flex rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
        >
          바로 시작하기
        </Link>
        <Link
          href="/projects"
          className="ml-2 inline-flex rounded-lg px-5 py-3 text-sm font-semibold text-neutral-700 ring-1 ring-neutral-300 hover:bg-neutral-50"
        >
          로그인 · 내 프로젝트
        </Link>
      </div>
    </main>
  );
}
