# Room Studio

가구를 실제로 옮기기 전에 집 구조와 가구를 실측 치수로 옮겨 놓고, 2D 평면도와 3D 미리보기로 재배치를 해 보는 웹 서비스.

## 개발

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm lint         # ESLint
pnpm typecheck    # tsc
pnpm test         # Vitest
pnpm format       # Prettier
pnpm build
```

## 스택

Next.js (App Router) · TypeScript · Tailwind CSS · Vitest. 예정: Konva(2D), react-three-fiber(3D), Zustand, Supabase.

## 로드맵

M0 셋업 → M1 구조 편집 → M2 문·창·가구 → M3 3D 미리보기 → M4 계정·저장 → M5 배치안 비교 → M6 충돌·동선 경고 → M7 공유·내보내기 → M8 다듬기
