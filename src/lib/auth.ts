"use client";

import type { User } from "@supabase/supabase-js";
import { useEffect } from "react";
import { create } from "zustand";
import { getSupabase } from "./supabase/client";
import { isSupabaseConfigured } from "./supabase/config";

type AuthState = { user: User | null; ready: boolean };

export const useAuthStore = create<AuthState>(() => ({
  user: null,
  ready: !isSupabaseConfigured,
}));

let started = false;

function startAuthListener() {
  if (started || !isSupabaseConfigured) return;
  started = true;
  const supabase = getSupabase();
  supabase.auth.getUser().then(({ data }) => {
    useAuthStore.setState({ user: data.user, ready: true });
  });
  supabase.auth.onAuthStateChange((_event, session) => {
    useAuthStore.setState({ user: session?.user ?? null, ready: true });
  });
}

/** 현재 로그인 사용자. ready가 false면 아직 확인 중 */
export function useAuth(): AuthState {
  useEffect(startAuthListener, []);
  return useAuthStore();
}

export async function signOut() {
  if (!isSupabaseConfigured) return;
  await getSupabase().auth.signOut();
}

export function displayName(user: User): string {
  const meta = user.user_metadata as Record<string, unknown>;
  const name = meta.full_name ?? meta.name ?? meta.nickname;
  if (typeof name === "string" && name) return name;
  return user.email?.split("@")[0] ?? "사용자";
}
