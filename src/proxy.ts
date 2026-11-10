import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_KEY, SUPABASE_URL, isSupabaseConfigured } from "@/lib/supabase/config";

/** Supabase 세션 쿠키 (sb-<ref>-auth-token, 크면 .0 .1로 나뉨). 로그인 진행용 code-verifier는 제외 */
function hasSessionCookie(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some((c) => /^sb-.+-auth-token(\.\d+)?$/.test(c.name) && !c.name.includes("code-verifier"));
}

/**
 * 로그인한 사람이 홈(/)에 오면 내 프로젝트(/projects)로 보낸다.
 * 쿠키만 믿지 않고 세션을 검증하며, 만료된 토큰은 이 과정에서 갱신된다.
 */
export async function proxy(request: NextRequest) {
  if (!isSupabaseConfigured || !hasSessionCookie(request)) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) return response;

  const redirect = NextResponse.redirect(new URL("/projects", request.url));
  // 토큰이 갱신됐다면 새 쿠키를 함께 보낸다
  for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
  return redirect;
}

export const config = {
  matcher: ["/"],
};
