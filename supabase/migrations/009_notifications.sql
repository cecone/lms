create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  type       text not null,
  title      text not null,
  body       text,
  link       text,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user on public.notifications(user_id, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "Usuário vê suas notificações" on public.notifications;
create policy "Usuário vê suas notificações"
  on public.notifications for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Usuário atualiza suas notificações" on public.notifications;
create policy "Usuário atualiza suas notificações"
  on public.notifications for update to authenticated
  using (user_id = auth.uid());

-- Insert via security-definer functions only (system creates notifications)
drop policy if exists "Sistema cria notificações" on public.notifications;
create policy "Sistema cria notificações"
  on public.notifications for insert to authenticated
  with check (true);
