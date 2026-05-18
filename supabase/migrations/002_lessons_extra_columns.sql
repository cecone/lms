-- =============================================
-- Migration 002 — Colunas extras em lessons
-- =============================================

alter table public.lessons
  add column if not exists description   text,
  add column if not exists allow_download boolean not null default true;
