"use client";

import { useSyncExternalStore } from "react";

/** CSS 미디어 쿼리 일치 여부 (화면 크기가 바뀌면 다시 그림) */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
