create table if not exists public.myfit_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.myfit_data enable row level security;
grant select, insert, update on public.myfit_data to authenticated;

create policy "myfit users read their own data"
on public.myfit_data for select to authenticated
using ((select auth.uid()) = user_id);

create policy "myfit users create their own data"
on public.myfit_data for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "myfit users update their own data"
on public.myfit_data for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

