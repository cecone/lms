-- =============================================
-- 012 — Administração de usuários
-- Adiciona flag de ativação ao perfil (usada para "desativar" usuários
-- sem apagar o histórico). A criação/edição/desativação de contas é feita
-- via server actions com a service role key (API admin do Supabase),
-- portanto não há novas policies de RLS aqui.
-- =============================================

alter table public.profiles
  add column if not exists is_active boolean not null default true;
