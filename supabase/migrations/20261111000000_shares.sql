-- Room Studio: 읽기 전용 공유 링크
-- 링크(token)를 아는 사람은 로그인 없이 프로젝트를 볼 수 있다. 끊으면(revoked_at) 바로 막힌다.

create table public.shares (
  token text primary key check (char_length(token) between 16 and 64),
  project_id uuid not null references public.projects (id) on delete cascade,
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index shares_project_idx on public.shares (project_id);

alter table public.shares enable row level security;

create policy "본인 공유 링크 조회"
on public.shares for select
to authenticated
using ((select auth.uid()) = owner_id);

-- 본인 프로젝트에만 링크를 만들 수 있다
create policy "본인 프로젝트 공유 링크 생성"
on public.shares for insert
to authenticated
with check (
  (select auth.uid()) = owner_id
  and exists (
    select 1 from public.projects p
    where p.id = project_id and p.owner_id = (select auth.uid())
  )
);

create policy "본인 공유 링크 수정"
on public.shares for update
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

create policy "본인 공유 링크 삭제"
on public.shares for delete
to authenticated
using ((select auth.uid()) = owner_id);

-- 링크로 보는 사람(로그인 안 함)은 이 함수로만 읽을 수 있다. 끊긴 링크는 아무것도 돌려주지 않는다.
create function public.get_shared(share_token text)
returns table (name text, document jsonb, updated_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select p.name, p.document, p.updated_at
  from public.shares s
  join public.projects p on p.id = s.project_id
  where s.token = share_token
    and s.revoked_at is null;
$$;

revoke all on function public.get_shared(text) from public;
grant execute on function public.get_shared(text) to anon, authenticated;
