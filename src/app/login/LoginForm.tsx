"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

type Provider = "google" | "kakao";

/**
 * 이메일 로그인 링크: Supabase 기본 메일은 시간당 2통·팀원에게만 보내지므로
 * 개발 중이거나, 별도 메일 서버(SMTP)를 연결하고 NEXT_PUBLIC_ENABLE_EMAIL_LOGIN=true일 때만 보인다.
 */
const EMAIL_LINK_ENABLED =
  process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_ENABLE_EMAIL_LOGIN === "true";

/** 개발용 비밀번호 로그인: 메일 없이 테스트 계정으로 들어간다. 배포용 빌드에는 나오지 않는다 */
const DEV_PASSWORD_LOGIN = process.env.NODE_ENV !== "production";

function callbackUrl() {
  return `${window.location.origin}/auth/callback?next=/projects`;
}

export function LoginForm() {
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(params.get("error"));

  if (!isSupabaseConfigured) {
    return (
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm ring-1 ring-neutral-200">
        <h1 className="text-xl font-semibold">로그인 준비 중</h1>
        <p className="mt-2 text-sm text-neutral-600">
          아직 로그인 서버가 연결되지 않았어요. 지금은 브라우저에 저장하면서 쓸 수 있어요.
        </p>
        <Link
          href="/editor"
          className="mt-6 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          로그인 없이 시작하기
        </Link>
      </div>
    );
  }

  const oauth = async (provider: Provider) => {
    setError(null);
    const { error } = await getSupabase().auth.signInWithOAuth({
      provider,
      options: { redirectTo: callbackUrl() },
    });
    if (error) setError(error.message);
  };

  const sendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatus("sending");
    const { error } = await getSupabase().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: callbackUrl() },
    });
    if (error) {
      setError(error.message);
      setStatus("idle");
    } else {
      setStatus("sent");
    }
  };

  return (
    <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm ring-1 ring-neutral-200">
      <Link href="/" className="text-sm font-semibold text-neutral-500">
        Room Studio
      </Link>
      <h1 className="mt-2 text-xl font-semibold">로그인</h1>
      <p className="mt-1 text-sm text-neutral-600">
        로그인하면 여러 집을 저장하고 다른 기기에서 이어서 편집할 수 있어요.
      </p>

      <div className="mt-6 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => oauth("google")}
          className="rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium hover:bg-neutral-50"
        >
          Google로 계속하기
        </button>
        <button
          type="button"
          onClick={() => oauth("kakao")}
          className="rounded-lg bg-[#FEE500] px-4 py-2.5 text-sm font-medium text-black/85 hover:brightness-95"
        >
          카카오로 계속하기
        </button>
      </div>

      {EMAIL_LINK_ENABLED && (
        <>
          <div className="my-6 flex items-center gap-3 text-xs text-neutral-500">
            <span className="h-px flex-1 bg-neutral-200" />
            또는
            <span className="h-px flex-1 bg-neutral-200" />
          </div>

          {status === "sent" ? (
            <p className="rounded-lg bg-blue-50 px-3 py-3 text-sm text-blue-800">
              {email}로 로그인 링크를 보냈어요. 메일함을 확인해 주세요.
            </p>
          ) : (
            <form onSubmit={sendLink} className="flex flex-col gap-2">
              <label className="text-xs text-neutral-600" htmlFor="email">
                이메일로 로그인 링크 받기
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.currentTarget.value)}
                placeholder="you@example.com"
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
              <button
                type="submit"
                disabled={status === "sending"}
                className="rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
              >
                {status === "sending" ? "보내는 중…" : "로그인 링크 보내기"}
              </button>
            </form>
          )}
        </>
      )}

      {DEV_PASSWORD_LOGIN && <PasswordLogin onError={setError} />}

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600">
          로그인하지 못했어요: {error}
        </p>
      )}

      <Link
        href="/editor"
        className="mt-6 block text-center text-sm text-neutral-500 hover:underline"
      >
        로그인 없이 써 보기
      </Link>
    </div>
  );
}

function PasswordLogin({ onError }: { onError: (message: string | null) => void }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    onError(null);
    setBusy(true);
    const { error } = await getSupabase().auth.signInWithPassword({ email, password });
    if (error) {
      onError(error.message);
      setBusy(false);
      return;
    }
    router.replace("/projects");
  };

  const input =
    "rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20";

  return (
    <form
      onSubmit={submit}
      className="mt-6 flex flex-col gap-2 rounded-lg border border-dashed border-amber-300 bg-amber-50/60 p-3"
    >
      <p className="text-xs font-semibold text-amber-800">개발용 · 비밀번호 로그인</p>
      <p className="text-xs leading-relaxed text-amber-900/80">
        Supabase 대시보드 Authentication → Users에서 &lsquo;Auto Confirm User&rsquo;로 만든 테스트
        계정용이에요. 배포하면 보이지 않아요.
      </p>
      <input
        type="email"
        required
        autoComplete="username"
        aria-label="테스트 계정 이메일"
        placeholder="이메일"
        value={email}
        onChange={(e) => setEmail(e.currentTarget.value)}
        className={input}
      />
      <input
        type="password"
        required
        autoComplete="current-password"
        aria-label="테스트 계정 비밀번호"
        placeholder="비밀번호"
        value={password}
        onChange={(e) => setPassword(e.currentTarget.value)}
        className={input}
      />
      <button
        type="submit"
        disabled={busy}
        className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
      >
        {busy ? "로그인 중…" : "비밀번호로 로그인"}
      </button>
    </form>
  );
}
