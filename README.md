# Room Studio

가구를 실제로 옮기기 전에 집 구조와 가구를 실측 치수로 옮겨 놓고, 2D 평면도와 3D로 재배치를 해 보는 웹 서비스.

- 집 구조: 프리셋·사각형 그리기, 벽 밀기·길이 입력, 문·창문
- 가구: 40여 종 카탈로그 + 직접 만들기, 벽·가구에 자동 맞춤, 회전
- 3D 미리보기(둘러보기·벽 낮추기·걸어 보기), 배치안 여러 개와 비교
- 충돌·동선 경고(겹침, 문·통로 막힘, 가구별 여유공간)
- 로그인 저장(Supabase), 보기 전용 공유 링크, 평면도·3D 이미지 저장

## 개발

```bash
pnpm install
cp .env.example .env.local   # Supabase 값 채우기 (없으면 브라우저 저장 모드로만 동작)
pnpm dev                     # http://localhost:4000
pnpm lint && pnpm typecheck && pnpm test
pnpm build
```

개발 서버에서는 로그인 화면에 **개발용 비밀번호 로그인**이 보입니다. Supabase 대시보드 Authentication → Users → Add user에서 Auto Confirm으로 만든 테스트 계정을 쓰면 메일 없이 로그인할 수 있습니다.

## 배포

[docs/DEPLOY.md](docs/DEPLOY.md) — Supabase 마이그레이션, Vercel 환경 변수, Google·카카오 로그인 설정, 배포 후 확인 목록.

## 구조

| 경로                                            | 내용                                                             |
| ----------------------------------------------- | ---------------------------------------------------------------- |
| `src/domain`                                    | 문서 모델(zod), 배치안 비교, 충돌·동선 경고                      |
| `src/geometry`                                  | 폴리곤·벽 편집, 문 위치, 가구 맞춤, 충돌, 3D 벽                  |
| `src/store`                                     | 편집 상태(zustand), 실행 취소, 게스트 저장                       |
| `src/components/canvas2d` · `canvas3d` · `plan` | Konva 편집 캔버스, three.js 3D, 읽기 전용 SVG 평면도             |
| `src/app`                                       | 첫 화면, `/editor`, `/projects`, `/p/[id]`, `/s/[token]`, 로그인 |
| `supabase/migrations`                           | 테이블·RLS·공유 함수                                             |
