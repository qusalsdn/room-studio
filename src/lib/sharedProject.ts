import "server-only";

import { cache } from "react";
import { parseDocument, type HouseDocument } from "@/domain/document";
import { SUPABASE_KEY, SUPABASE_URL, isSupabaseConfigured } from "./supabase/config";

export type SharedProject = { name: string; document: HouseDocument; updatedAt: string };

/**
 * 공유 링크로 프로젝트 읽기 (로그인 없이, get_shared 함수 경유).
 * 링크를 끊으면 바로 반영되도록 캐시하지 않고, 한 요청 안에서만 중복 호출을 합친다.
 */
export const getSharedProject = cache(async (token: string): Promise<SharedProject | null> => {
  if (!isSupabaseConfigured || !/^[A-Za-z0-9_-]{16,64}$/.test(token)) return null;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_shared`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ share_token: token }),
    cache: "no-store",
  });
  if (!res.ok) return null;
  const rows = (await res.json()) as { name: string; document: unknown; updated_at: string }[];
  const row = rows[0];
  const document = row ? parseDocument(row.document) : null;
  if (!row || !document) return null;
  return { name: row.name, document, updatedAt: row.updated_at };
});
