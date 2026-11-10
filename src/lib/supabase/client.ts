"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_KEY, SUPABASE_URL, isSupabaseConfigured } from "./config";

let client: SupabaseClient | null = null;

/** 브라우저용 Supabase 클라이언트 (세션은 쿠키에 저장, 토큰 갱신은 자동) */
export function getSupabase(): SupabaseClient {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase 환경 변수가 설정되지 않았어요 (.env.local 확인)");
  }
  client ??= createBrowserClient(SUPABASE_URL, SUPABASE_KEY);
  return client;
}
