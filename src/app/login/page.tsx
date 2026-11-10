import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "로그인 · Room Studio" };

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center bg-stone-50 px-4 py-16">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
