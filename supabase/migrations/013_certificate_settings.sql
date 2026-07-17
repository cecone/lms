-- ─────────────────────────────────────────────────────────────────────────────
-- CERTIFICATE SETTINGS (singleton — configuração global do certificado)
-- Uma única linha (id = 1) com marca, textos e assinatura padrão da instituição.
-- Consumida tanto pela página do certificado quanto pela verificação pública.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.certificate_settings (
  id                   smallint primary key default 1 check (id = 1),
  institution_name     text        not null default 'learn·studio',
  logo_url             text,
  brand_color          text        not null default '#22c55e',
  title                text        not null default 'Certificado de Conclusão',
  intro_text           text        not null default 'Certificamos que',
  middle_text          text        not null default 'concluiu com êxito o curso',
  footer_text          text,
  signature_name       text,
  signature_role       text,
  signature_image_url  text,
  verify_url_base      text        not null default 'learnstudio.app/verify',
  updated_at           timestamptz not null default now()
);

-- Garante a linha única de configuração.
insert into public.certificate_settings (id) values (1)
on conflict (id) do nothing;

alter table public.certificate_settings enable row level security;

-- Leitura liberada para todos: a página pública /verify e o certificado
-- impresso precisam da marca da instituição mesmo sem sessão.
grant select on public.certificate_settings to anon, authenticated;

drop policy if exists "certificate_settings readable by all" on public.certificate_settings;
create policy "certificate_settings readable by all"
  on public.certificate_settings for select
  using (true);

-- Escrita apenas por admins. O painel usa o client service-role (ignora RLS),
-- mas mantemos a policy como defesa em profundidade.
drop policy if exists "certificate_settings writable by admin" on public.certificate_settings;
create policy "certificate_settings writable by admin"
  on public.certificate_settings for update
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );
