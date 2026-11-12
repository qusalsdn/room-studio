"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useEditorStore } from "@/store/editorStore";
import { Button } from "./fields";

const GUIDE_SEEN_KEY = "room-studio:guide-seen";

const STEPS: { title: string; body: ReactNode }[] = [
  {
    title: "1. 집 구조 그리기",
    body: (
      <ul>
        <li>
          왼쪽 <b>프리셋</b>(원룸·투룸 등)으로 시작하거나 <Kbd>R</Kbd>을 누르고 끌어서 방을 그려요.
        </li>
        <li>
          방을 고른 뒤 오른쪽 <b>벽 길이</b>에 실측값을 넣으면 그대로 맞춰져요.
        </li>
        <li>벽을 끌면 밀리고, 벽을 더블클릭하면 꺾을 수 있는 점이 생겨요.</li>
        <li>
          벽을 클릭하고 오른쪽에서 <b>문·창문</b>을 달아요.
        </li>
      </ul>
    ),
  },
  {
    title: "2. 가구 놓기",
    body: (
      <ul>
        <li>
          위쪽 <b>가구 배치</b> 탭(<Kbd>2</Kbd>)으로 바꿔요. 구조는 잠겨서 실수로 안 움직여요.
        </li>
        <li>
          왼쪽 목록에서 클릭하거나 끌어다 놓고, 오른쪽에서 <b>실제 치수</b>로 바꿔요.
        </li>
        <li>
          끌면 벽·다른 가구에 딱 붙고, 위쪽 동그라미로 돌려요 (<Kbd>R</Kbd>은 90°).
        </li>
        <li>목록에 없는 물건은 &lsquo;직접 만들기&rsquo;로 이름과 치수만 넣으면 돼요.</li>
        <li>
          가구를 놓으면 둘 만한 자리가 <b>번호</b>로 떠요. 누르면 그리로 옮기고, <Kbd>Esc</Kbd>로
          닫아요. 놓인 가구도 오른쪽 <b>자리 추천</b>으로 다시 볼 수 있어요.
        </li>
        <li>
          새 가구로 바꿀 생각이면 오른쪽 <b>다른 가구로 교체</b>를 눌러요. 벽에 붙어 있던 면은
          그대로 두고 바꾸고, 안 맞으면 옮길 자리를 추천해요.
        </li>
      </ul>
    ),
  },
  {
    title: "3. 확인하기",
    body: (
      <ul>
        <li>
          위쪽 <b>3D</b>·<b>나란히</b>로 입체로 보고, &lsquo;걸어 보기&rsquo;로 방 안을 돌아다녀요.
        </li>
        <li>
          겹치거나 문·통로를 막으면 빨강·주황으로 표시되고 오른쪽 <b>확인할 점</b>에 정리돼요.
        </li>
      </ul>
    ),
  },
  {
    title: "4. 여러 안 비교하고 공유하기",
    body: (
      <ul>
        <li>
          <b>＋ 새 배치안</b>으로 지금 배치를 복제해 다른 안을 만들고 <b>비교하기</b>로 차이를 봐요.
        </li>
        <li>
          로그인하면 자동 저장되고, <b>공유</b>로 보기 전용 링크를 보낼 수 있어요.
        </li>
        <li>
          <b>이미지 저장</b>으로 평면도·3D(또는 둘을 나란히)를 PNG로 받아요. 단축키는 <Kbd>?</Kbd>로 볼 수 있어요.
        </li>
      </ul>
    ),
  },
];

const SHORTCUTS: [string, string][] = [
  ["1 / 2", "구조 / 가구 배치 모드"],
  ["V", "선택 도구"],
  ["R", "구조: 방 그리기 · 가구: 90° 회전 (Shift+R 반대로)"],
  ["F", "화면 맞춤"],
  ["Space + 드래그", "화면 이동 (빈 곳 드래그도 됨)"],
  ["휠 · 핀치", "확대 / 축소"],
  ["방향키", "선택한 것 1cm 이동 (Shift 10cm)"],
  ["Delete", "선택한 방·꼭짓점·문·가구 삭제"],
  ["⌘D", "가구 복제"],
  ["⌘Z / ⇧⌘Z", "실행 취소 / 다시 실행"],
  ["Alt + 드래그", "자동 맞춤·스냅 끄기"],
  ["Shift + 꼭짓점 드래그", "직각 유지 끄기"],
  ["Esc", "그리기 취소 · 선택 해제"],
  ["?", "단축키 보기"],
];

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-neutral-300 bg-neutral-50 px-1 font-mono text-[0.85em]">
      {children}
    </kbd>
  );
}

function Dialog({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-4"
      onPointerDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-title"
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl ring-1 ring-neutral-200"
      >
        <h2 id="help-title" className="text-lg font-semibold">
          {title}
        </h2>
        <div className="mt-3 text-sm leading-relaxed text-neutral-700">{children}</div>
        <div className="mt-6 flex items-center justify-end gap-2">{footer}</div>
      </div>
    </div>
  );
}

function Guide({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const last = step === STEPS.length - 1;
  return (
    <Dialog
      title={STEPS[step].title}
      onClose={onClose}
      footer={
        <>
          <span className="mr-auto text-xs text-neutral-500">
            {step + 1} / {STEPS.length}
          </span>
          {step > 0 && (
            <Button variant="ghost" onClick={() => setStep(step - 1)}>
              이전
            </Button>
          )}
          <Button
            variant="primary"
            autoFocus
            onClick={() => (last ? onClose() : setStep(step + 1))}
          >
            {last ? "시작하기" : "다음"}
          </Button>
        </>
      }
    >
      <div className="[&_li]:mt-2 [&_ul]:list-disc [&_ul]:pl-5">{STEPS[step].body}</div>
    </Dialog>
  );
}

function Shortcuts({ onClose }: { onClose: () => void }) {
  return (
    <Dialog
      title="단축키"
      onClose={onClose}
      footer={
        <Button variant="primary" autoFocus onClick={onClose}>
          닫기
        </Button>
      }
    >
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
        {SHORTCUTS.map(([key, what]) => (
          <div key={key} className="contents">
            <dt>
              <Kbd>{key}</Kbd>
            </dt>
            <dd>{what}</dd>
          </div>
        ))}
      </dl>
    </Dialog>
  );
}

/** 처음 온 사람에게 사용 안내를 한 번 보여 주고, 도움말·단축키 창을 띄운다 */
export function HelpDialogs() {
  const help = useEditorStore((s) => s.help);
  const setHelp = useEditorStore((s) => s.setHelp);

  useEffect(() => {
    try {
      if (!localStorage.getItem(GUIDE_SEEN_KEY)) setHelp("guide");
    } catch {
      // 저장소를 못 쓰는 환경이면 안내를 띄우지 않는다
    }
  }, [setHelp]);

  const close = () => {
    if (help === "guide") {
      try {
        localStorage.setItem(GUIDE_SEEN_KEY, "1");
      } catch {
        // 무시
      }
    }
    setHelp(null);
  };

  if (help === "guide") return <Guide onClose={close} />;
  if (help === "shortcuts") return <Shortcuts onClose={close} />;
  return null;
}
