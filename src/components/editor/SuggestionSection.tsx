"use client";

import { activeSuggestion, useEditorStore } from "@/store/editorStore";
import { Button, Section } from "./fields";

/** 속성 패널의 "자리 추천": 버튼, 후보 목록(이유·적용), 지금 자리가 가장 좋을 때 안내 */
export function SuggestionSection({ itemId }: { itemId: string }) {
  const sug = useEditorStore(activeSuggestion);
  const s = useEditorStore.getState;
  const shown = sug?.itemId === itemId ? sug : null;

  return (
    <Section title="자리 추천">
      {!shown ? (
        <div className="flex flex-col gap-1.5">
          <Button onClick={() => s().suggestFor(itemId)}>이 가구 자리 추천</Button>
          <p className="text-xs text-neutral-500">
            다른 가구는 그대로 두고, 이 방에서 더 좋은 자리를 찾아 도면에 보여 줘요.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5 text-sm">
          {shown.spots.length === 0 ? (
            <p className="text-neutral-600">
              {shown.currentIsBest
                ? "지금 자리가 가장 좋아요."
                : "이 방에는 겹치거나 문을 막지 않고 놓을 자리가 없어요."}
            </p>
          ) : (
            <>
              <p className="text-xs text-neutral-500">
                {shown.isNew
                  ? "방금 놓은 가구를 둘 만한 자리예요."
                  : "지금 자리보다 나은 곳이에요."}{" "}
                도면의 번호를 눌러도 옮겨요.
              </p>
              <ol className="flex flex-col gap-1">
                {shown.spots.map((spot, i) => (
                  <li
                    key={`${spot.x},${spot.y},${spot.rotation}`}
                    onPointerEnter={() => s().hoverSuggestion(i)}
                    onPointerLeave={() => s().hoverSuggestion(null)}
                    className={`flex items-center gap-2 rounded-md px-2 py-1.5 ring-1 ${
                      shown.hovered === i ? "bg-blue-50 ring-blue-300" : "ring-neutral-200"
                    }`}
                  >
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1 text-xs text-neutral-700">
                      {spot.reasons.join(" · ")}
                    </span>
                    <Button onClick={() => s().applySuggestion(i)}>옮기기</Button>
                  </li>
                ))}
              </ol>
            </>
          )}
          <div className="flex justify-end">
            <Button variant="ghost" onClick={() => s().clearSuggestion()} title="Esc">
              닫기
            </Button>
          </div>
        </div>
      )}
    </Section>
  );
}
