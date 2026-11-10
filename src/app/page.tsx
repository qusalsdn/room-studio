import Link from "next/link";
import { demoHouse } from "@/catalog/demo";
import { StaticPlan } from "@/components/plan/StaticPlan";
import { currentLayout } from "@/store/editorStore";

const FEATURES = [
  {
    title: "실측 그대로 평면도",
    body: "프리셋으로 시작하거나 끌어서 방을 그리고, 벽 길이에 줄자로 잰 값을 넣으면 그대로 맞춰져요. 문·창문도 달 수 있어요.",
  },
  {
    title: "우리 집 가구를 실제 크기로",
    body: "침대·소파·옷장·가전 등 40가지가 넘는 가구를 고르고 치수만 바꾸면 돼요. 목록에 없으면 이름과 크기만 넣어 만들어요.",
  },
  {
    title: "3D로 보고 걸어 보기",
    body: "평면도를 고치면 3D에 바로 반영돼요. 벽을 낮춰 한눈에 보거나, 눈높이로 방 안을 걸어 볼 수 있어요.",
  },
  {
    title: "놓기 전에 걸리는 곳 확인",
    body: "가구끼리 겹치거나, 문이 열리는 자리·통로를 막거나, 옷장 앞이 좁으면 바로 알려 줘요.",
  },
  {
    title: "여러 안을 만들어 비교",
    body: "지금 배치를 복제해 다른 안을 만들고, 겹쳐 보기로 무엇이 얼마나 옮겨졌는지 한눈에 비교해요.",
  },
  {
    title: "가족과 공유",
    body: "로그인하면 자동 저장되고, 보기 전용 링크로 공유하거나 평면도·3D를 이미지로 저장할 수 있어요.",
  },
];

export default function Home() {
  const demo = demoHouse();
  return (
    <div className="flex flex-1 flex-col bg-white text-neutral-900">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <span className="text-base font-semibold">Room Studio</span>
        <nav className="flex items-center gap-2 text-sm">
          <Link
            href="/projects"
            className="rounded-md px-3 py-1.5 text-neutral-700 hover:bg-neutral-100"
          >
            로그인
          </Link>
          <Link
            href="/editor"
            className="rounded-md bg-neutral-900 px-3 py-1.5 font-medium text-white hover:bg-neutral-800"
          >
            바로 시작
          </Link>
        </nav>
      </header>

      <main className="flex-1">
        <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-6 pt-10 pb-20 lg:grid-cols-[1fr_1.15fr]">
          <div>
            <h1 className="text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">
              옮기기 전에,
              <br />
              먼저 배치해 보세요.
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-neutral-600">
              우리 집 구조와 가구를 실측 치수로 옮겨 놓고, 평면도와 3D로 재배치를 미리 확인하세요.
              무거운 가구를 옮겼다가 안 맞아서 다시 옮길 일이 없어요.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/editor"
                className="inline-flex rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
              >
                로그인 없이 바로 시작
              </Link>
              <Link
                href="/projects"
                className="inline-flex rounded-lg px-5 py-3 text-sm font-semibold text-neutral-700 ring-1 ring-neutral-300 hover:bg-neutral-50"
              >
                로그인하고 저장하기
              </Link>
            </div>
            <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 sm:hidden">
              방을 그리고 가구를 옮기는 편집은 컴퓨터에서 할 수 있어요. 휴대폰에서는 저장한 집을
              보기만 할 수 있어요.
            </p>
            <p className="mt-4 text-sm text-neutral-500">
              로그인 없이 쓴 작업은 이 브라우저에 저장되고, 나중에 로그인하면 계정으로 옮길 수
              있어요.
            </p>
          </div>
          <figure className="overflow-hidden rounded-2xl bg-stone-50 p-4 ring-1 ring-neutral-200">
            <StaticPlan
              doc={demo}
              items={currentLayout(demo).items.map((item) => ({ item, style: "normal" }))}
              showDimensions
              className="h-auto w-full"
              title="예시: 투룸에 가구를 배치한 평면도"
            />
            <figcaption className="mt-2 text-center text-xs text-neutral-500">
              투룸 예시 · 실제 편집 화면에서 끌어서 옮기고 3D로 볼 수 있어요
            </figcaption>
          </figure>
        </section>

        <section className="border-t border-neutral-100 bg-stone-50">
          <div className="mx-auto w-full max-w-6xl px-6 py-16">
            <h2 className="text-2xl font-semibold tracking-tight">이런 걸 할 수 있어요</h2>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <li key={f.title} className="rounded-xl bg-white p-5 ring-1 ring-neutral-200">
                  <h3 className="font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-600">{f.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-6 py-16">
          <h2 className="text-2xl font-semibold tracking-tight">세 단계면 충분해요</h2>
          <ol className="mt-8 grid gap-6 sm:grid-cols-3">
            {[
              ["줄자로 재기", "방 가로·세로와 문 위치, 옮길 가구의 가로·깊이를 재 두세요."],
              ["옮겨 그리기", "프리셋으로 방을 만들고 치수를 넣은 뒤, 가구를 실제 크기로 놓아요."],
              ["여러 안 비교", "배치안을 몇 개 만들어 3D와 경고를 보며 가장 좋은 안을 고르세요."],
            ].map(([title, body], i) => (
              <li key={title}>
                <span className="text-sm font-semibold text-blue-600">0{i + 1}</span>
                <h3 className="mt-1 font-semibold">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-neutral-600">{body}</p>
              </li>
            ))}
          </ol>
          <Link
            href="/editor"
            className="mt-10 inline-flex rounded-lg bg-neutral-900 px-5 py-3 text-sm font-semibold text-white hover:bg-neutral-800"
          >
            지금 우리 집 그려 보기
          </Link>
        </section>
      </main>

      <footer className="border-t border-neutral-100 py-6 text-center text-xs text-neutral-500">
        Room Studio
      </footer>
    </div>
  );
}
