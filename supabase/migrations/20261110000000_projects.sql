-- Room Studio: 사용자별 프로젝트(집) 저장
-- 문서 전체(구조 + 배치안)를 jsonb 한 칸에 저장하고 schema_version으로 형식 변경에 대비한다.

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null default '우리 집' check (char_length(name) between 1 and 100),
  document jsonb not null,
  schema_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index projects_owner_updated_idx on public.projects (owner_id, updated_at desc);

-- 수정할 때마다 updated_at 갱신
create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger projects_touch_updated_at
before update on public.projects
for each row execute function public.touch_updated_at();

-- 행 수준 보안: 로그인한 본인 프로젝트만 읽고 쓸 수 있다
alter table public.projects enable row level security;

create policy "본인 프로젝트 조회"
on public.projects for select
to authenticated
using ((select auth.uid()) = owner_id);

create policy "본인 프로젝트 생성"
on public.projects for insert
to authenticated
with check ((select auth.uid()) = owner_id);

create policy "본인 프로젝트 수정"
on public.projects for update
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

create policy "본인 프로젝트 삭제"
on public.projects for delete
to authenticated
using ((select auth.uid()) = owner_id);
