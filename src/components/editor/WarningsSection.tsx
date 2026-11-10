"use client";

import type { Warning } from "@/domain/warnings";
import { useEditorStore } from "@/store/editorStore";
import { Section } from "./fields";
import { useWarnings } from "./useWarnings";

const DOT: Record<Warning["severity"], string> = {
  error: "bg-red-600",
  warning: "bg-orange-500",
};

/** 충돌·동선 경고 목록. itemId를 주면 그 가구 경고만 */
export function WarningsSection({ itemId }: { itemId?: string }) {
  const all = useWarnings();
  const showWarnings = useEditorStore((s) => s.showWarnings);
  const s = useEditorStore.getState;
  const warnings = itemId ? all.filter((w) => w.itemIds.includes(itemId)) : all;
  if (itemId && warnings.length === 0) return null;

  const errors = warnings.filter((w) => w.severity === "error").length;

  return (
    <Section title={`확인할 점 ${warnings.length}`}>
      {!itemId && (
        <label className="flex items-center gap-2 text-xs text-neutral-600">
          <input
            type="checkbox"
            checked={showWarnings}
            onChange={(e) => s().setShowWarnings(e.currentTarget.checked)}
          />
          도면에 표시
        </label>
      )}
      {warnings.length === 0 ? (
        <p className="text-sm text-emerald-700">겹치거나 막힌 곳이 없어요.</p>
      ) : (
        <>
          {!itemId && (
            <p className="text-xs text-neutral-500">
              <span className="text-red-600">문제 {errors}</span> ·{" "}
              <span className="text-orange-600">주의 {warnings.length - errors}</span>
            </p>
          )}
          <ul className="flex flex-col">
            {warnings.map((w) => (
              <li key={w.id}>
                <button
                  type="button"
                  onClick={() => {
                    if (!itemId) s().select({ kind: "furniture", itemId: w.itemIds[0] });
                  }}
                  onMouseEnter={() => s().setFocusedWarning(w.id)}
                  onMouseLeave={() => s().setFocusedWarning(null)}
                  className="flex w-full items-start gap-2 rounded-md px-1.5 py-1.5 text-left text-sm leading-snug text-neutral-800 hover:bg-neutral-100"
                >
                  <span className={`mt-1.5 size-2 shrink-0 rounded-full ${DOT[w.severity]}`} />
                  {w.message}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </Section>
  );
}
