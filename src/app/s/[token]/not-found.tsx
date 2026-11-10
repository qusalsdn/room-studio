import Link from "next/link";

export default function SharedNotFound() {
  return (
    <main className="flex h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-lg font-semibold">공유 링크를 찾을 수 없어요</h1>
      <p className="text-sm text-neutral-600">
        링크가 끊겼거나 주소가 잘못됐어요. 보낸 분께 다시 받아 주세요.
      </p>
      <Link href="/" className="mt-2 text-sm font-medium text-blue-600 hover:underline">
        Room Studio 둘러보기
      </Link>
    </main>
  );
}
