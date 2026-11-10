import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getServerSupabase } from "@/lib/supabase/server";

/** 소셜 로그인·이메일 링크에서 돌아오는 곳: 받은 코드를 세션으로 바꾼다 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/projects";
  // 외부 주소로 보내지 않도록 같은 사이트 경로만 허용
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/projects";

  if (!isSupabaseConfigured || !code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }
  const supabase = await getServerSupabase();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
  }
  return NextResponse.redirect(`${origin}${safeNext}`);
}
