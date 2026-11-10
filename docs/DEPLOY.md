# 배포와 로그인 설정

Room Studio를 공개 주소로 띄우기 위한 순서입니다. 아래 `<배포 주소>`는 실제 주소(예: `https://roomstudio.vercel.app` 또는 연결한 도메인)로, `<project-ref>`는 Supabase 프로젝트 주소의 앞부분(`https://<project-ref>.supabase.co`)으로 바꿔 읽어 주세요.

## 1. Supabase 데이터베이스

SQL Editor에서 마이그레이션을 **순서대로** 한 번씩 실행합니다. 이미 실행한 것은 다시 실행하지 않습니다.

1. `supabase/migrations/20261110000000_projects.sql` — 프로젝트 저장, 본인만 접근(RLS)
2. `supabase/migrations/20261111000000_shares.sql` — 공유 링크, 로그인 없이 읽는 `get_shared` 함수

## 2. Vercel에 배포

1. [vercel.com](https://vercel.com)에서 **Add New → Project**로 GitHub 저장소 `room-studio`를 가져옵니다. Next.js·pnpm은 자동으로 잡힙니다.
2. **Environment Variables**에 다음을 넣습니다 (Production, Preview 모두).

   | 이름                                   | 값                                                         |
   | -------------------------------------- | ---------------------------------------------------------- |
   | `NEXT_PUBLIC_SUPABASE_URL`             | Supabase Project Settings → API의 Project URL              |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 같은 곳의 publishable 키 (`sb_publishable_…`)              |
   | `NEXT_PUBLIC_SITE_URL`                 | `<배포 주소>` — 공유 링크 미리보기 이미지 주소에 쓰임      |
   | `NEXT_PUBLIC_ENABLE_EMAIL_LOGIN`       | 넣지 않음. 별도 메일 서버(아래 5번)를 연결한 뒤에만 `true` |

3. 배포할 브랜치를 정합니다. 지금 작업은 `dev`에 있으므로 `main`에 합친 뒤 배포하거나, Vercel의 Production Branch를 `dev`로 바꿉니다.

> 비밀번호 로그인(개발용)은 배포 빌드에 포함되지 않습니다.

## 3. Supabase 로그인 주소 설정

Authentication → **URL Configuration**

- **Site URL**: `<배포 주소>`
- **Redirect URLs**에 추가:
  - `<배포 주소>/auth/callback`
  - `http://localhost:4000/auth/callback` (개발용)
  - Vercel 미리보기 배포에서도 로그인하려면 `https://*-<vercel 팀 이름>.vercel.app/auth/callback`

## 4. 소셜 로그인

두 서비스 모두 로그인 후 돌아오는 주소(Redirect URI)는 **우리 사이트가 아니라 Supabase 주소**입니다.

```
https://<project-ref>.supabase.co/auth/v1/callback
```

### Google

1. [Google Cloud Console](https://console.cloud.google.com/)에서 프로젝트를 만들고 **OAuth 동의 화면**을 설정합니다 (외부 사용자, 앱 이름 "Room Studio", 지원 이메일, 범위 `email`·`profile`·`openid`). 공개 전에는 테스트 사용자로 등록한 계정만 로그인할 수 있습니다.
2. **사용자 인증 정보 → OAuth 클라이언트 ID** → 유형 **웹 애플리케이션**
   - 승인된 JavaScript 원본: `<배포 주소>`, `http://localhost:4000`
   - 승인된 리디렉션 URI: `https://<project-ref>.supabase.co/auth/v1/callback`
3. 만들어진 **클라이언트 ID·보안 비밀**을 Supabase Authentication → Providers → **Google**에 넣고 켭니다.

### 카카오

1. [Kakao Developers](https://developers.kakao.com/)에서 애플리케이션을 추가합니다.
2. **플랫폼 → Web**에 사이트 도메인(`<배포 주소>`, `http://localhost:4000`)을 등록합니다.
3. **카카오 로그인**을 활성화하고 Redirect URI에 `https://<project-ref>.supabase.co/auth/v1/callback`을 넣습니다.
4. **동의항목**에서 닉네임·프로필 사진을 켭니다. 이메일(`account_email`)은 비즈 앱 전환이 필요할 수 있습니다. 이메일을 받지 않으면 Supabase의 Kakao 설정에서 **Allow users without an email**을 켭니다.
5. **앱 키(REST API 키)** 와 **카카오 로그인 Client Secret**(활성화 필요)을 Supabase Authentication → Providers → **Kakao**의 Client ID·Client Secret에 넣고 켭니다.

콘솔 화면 이름은 바뀔 수 있으니 막히면 Supabase 공식 안내를 함께 보세요: [Sign in with Google](https://supabase.com/docs/guides/auth/social-login/auth-google), [Sign in with Kakao](https://supabase.com/docs/guides/auth/social-login/auth-kakao).

## 5. (선택) 이메일 로그인 켜기

Supabase 기본 메일은 **시간당 2통, 조직 팀원에게만** 보내져서 공개 서비스에는 쓸 수 없습니다. 이메일 로그인을 열려면:

1. Resend·AWS SES 같은 메일 발송 서비스를 Supabase Authentication → **SMTP Settings**에 연결합니다 (보내는 도메인 인증 필요).
2. Authentication → Rate Limits에서 메일 한도를 확인합니다.
3. Vercel 환경 변수 `NEXT_PUBLIC_ENABLE_EMAIL_LOGIN=true`를 넣고 다시 배포합니다.

## 6. 배포 후 확인

- [ ] 첫 화면이 열리고, 로그인 상태로 `/`에 가면 `/projects`로 이동
- [ ] Google·카카오로 로그인 → 새 프로젝트 → 편집 후 "저장됨" → 새로고침해도 유지
- [ ] 로그인 전 `/editor`에서 그린 집이 "계정으로 가져오기"로 옮겨짐
- [ ] 공유 링크를 로그인 안 한 창에서 열기, 메신저에 붙였을 때 미리보기 이미지
- [ ] 링크를 끊으면 404와 "공유 링크를 찾을 수 없어요"
- [ ] 휴대폰에서 보기 화면과 안내
