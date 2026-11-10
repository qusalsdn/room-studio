import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 bg-white px-6 py-24 text-center">
      <h1 className="text-lg font-semibold">페이지를 찾을 수 없어요</h1>
      <p className="text-sm text-neutral-600">주소가 바뀌었거나 없는 페이지예요.</p>
      <Link href="/" className="mt-2 text-sm font-medium text-blue-600 hover:underline">
        처음으로
      </Link>
    </main>
  );
}
