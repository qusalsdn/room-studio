"use client";

import { getSupabase } from "./supabase/client";

/** URL에 넣기 좋은 무작위 토큰 (128비트) */
function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function shareUrl(token: string): string {
  return `${window.location.origin}/s/${token}`;
}

/** 이 프로젝트에 살아 있는 공유 링크 (없으면 null) */
export async function getActiveShare(projectId: string): Promise<string | null> {
  const { data, error } = await getSupabase()
    .from("shares")
    .select("token")
    .eq("project_id", projectId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data?.token as string | undefined) ?? null;
}

export async function createShare(projectId: string): Promise<string> {
  const token = randomToken();
  const { error } = await getSupabase().from("shares").insert({ token, project_id: projectId });
  if (error) throw error;
  return token;
}

/** 링크 끊기: 이 링크로는 더 이상 볼 수 없다 */
export async function revokeShare(token: string): Promise<void> {
  const { error } = await getSupabase()
    .from("shares")
    .update({ revoked_at: new Date().toISOString() })
    .eq("token", token);
  if (error) throw error;
}
